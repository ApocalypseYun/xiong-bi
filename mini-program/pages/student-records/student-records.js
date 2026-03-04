const { post } = require('../../utils/request.js');
const API_BASE = 'http://localhost:3000';

const statusMap = {
  'pending': { text: '待处理', color: '#f5a623', bgColor: '#fff7e6' },
  'processing': { text: '处理中', color: '#4a90d9', bgColor: '#e6f2ff' },
  'completed': { text: '已完成', color: '#7ed321', bgColor: '#e8f5e0' },
  'withdrawn': { text: '已撤回', color: '#9b9b9b', bgColor: '#f5f5f5' }
};

Page({
  data: {
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'processing', label: '处理中' },
      { key: 'completed', label: '已完成' }
    ],
    currentTab: '',
    currentTabLabel: '',
    orders: [],
    loading: false,
    refreshing: false,
    showDetailModal: false,
    currentOrder: null,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.fetchOrders();
  },

  onShow() {
    this.fetchOrders();
  },


  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    const tabLabel = this.data.tabs.find(t => t.key === tab)?.label || '';
    this.setData({
      currentTab: tab,
      currentTabLabel: tabLabel,
      orders: [],
      page: 1,
      hasMore: true
    }, () => {
      this.fetchOrders();
    });
  },


  fetchOrders() {
    if (this.data.loading || !this.data.hasMore) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    let url = `${API_BASE}/api/orders?page=${this.data.page}&pageSize=${this.data.pageSize}`;
    if (this.data.currentTab) {
      url += `&status=${this.data.currentTab}`;
    }

    wx.request({
      url: url,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.data.code === 200) {
          const orders = res.data.data || [];
          const formattedOrders = orders.map(order => ({
            ...order,
            statusInfo: statusMap[order.status] || statusMap.pending,
            createdAtFormatted: this.formatDate(order.createdAt),
            previewImages: order.images ? order.images.slice(0, 3) : [],
            imageUrls: order.images ? order.images.map(img => img.imageUrl) : []
          }));

          this.setData({
            orders: this.data.page === 1 ? formattedOrders : [...this.data.orders, ...formattedOrders],
            hasMore: orders.length === this.data.pageSize,
            page: this.data.page + 1
          });
        } else {
          wx.showToast({ title: res.data.message || '获取失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false, refreshing: false });
      }
    });
  },


  onPullDownRefresh() {
    this.setData({
      orders: [],
      page: 1,
      hasMore: true,
      refreshing: true
    }, () => {
      this.fetchOrders();
    });
    wx.stopPullDownRefresh();
  },


  onLoadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    this.fetchOrders();
  },


  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.orderId === orderId);
    if (order) {
      // 处理图片 URL 数组用于预览
      const processedOrder = {
        ...order,
        imageUrls: order.images ? order.images.map(img => img.imageUrl) : [],
        completionImageUrls: order.completionImages ? order.completionImages.map(img => img.imageUrl) : []
      };
      this.setData({
        currentOrder: processedOrder,
        showDetailModal: true
      });
    }
  },


  onCloseDetail() {
    this.setData({
      showDetailModal: false,
      currentOrder: null
    });
  },


  onGoToEvaluation() {
    if (this.data.currentOrder && this.data.currentOrder.status === 'completed') {
      wx.navigateTo({
        url: `/pages/student-evaluation/student-evaluation?orderId=${this.data.currentOrder.orderId}`
      });
      this.onCloseDetail();
    } else {
      wx.showToast({ title: '只有已完成的订单可以评价', icon: 'none' });
    }
  },


  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },


  },

  // Task 18: 催单功能（6小时后可点击）
  async onUrgeOrder() {
    const { currentOrder } = this.data;
    if (!currentOrder) return;

    try {
      const res = await post(`/orders/${currentOrder.orderId}/urge`);
      if (res.code === 200) {
        wx.showToast({ title: '催单成功', icon: 'success' });
        this.onCloseDetail();
        this.setData({ orders: [], page: 1, hasMore: true });
        this.fetchOrders();
      } else {
        wx.showToast({ title: res.message || '催单失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '催单失败', icon: 'none' });
    }
  },

  // Task 18: 撤单功能（仅pending可撤）
  onWithdrawOrder() {
    const { currentOrder } = this.data;
    if (!currentOrder) return;

    wx.showModal({
      title: '确认撤单',
      content: '确定要撤回这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await post(`/orders/${currentOrder.orderId}/withdraw`);
            if (result.code === 200) {
              wx.showToast({ title: '撤单成功', icon: 'success' });
              this.onCloseDetail();
              this.setData({ orders: [], page: 1, hasMore: true });
              this.fetchOrders();
            } else {
              wx.showToast({ title: result.message || '撤单失败', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '撤单失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 检查是否可以催单（6小时后）
  canUrge(order) {
    if (!order || order.status !== 'pending') return false;
    if (order.isUrge) return false; // 已催过
    const createdAt = new Date(order.createdAt).getTime();
    const now = Date.now();
    const hours = (now - createdAt) / (1000 * 60 * 60);
    return hours >= 6;
  },

  // 检查是否可以撤单
  icanWithdraw(order) {
    return order && order.status === 'pending';
  }
});