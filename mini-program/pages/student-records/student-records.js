const API_BASE = 'http://localhost:3000';
const { post, del } = require('../../utils/request');

const statusMap = {
  'pending': { text: '待处理', color: '#f5a623', bgColor: '#fff7e6' },
  'processing': { text: '处理中', color: '#4a90d9', bgColor: '#e6f2ff' },
  'completed': { text: '已完成', color: '#7ed321', bgColor: '#e8f5e0' }
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

          formattedOrders.forEach(o => {
            if (o.status === 'pending') o.urgeStatus = this.computeUrgeStatus(o);
          });
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


  computeUrgeStatus(order) {
    if (order.status !== 'pending') return null;
    const now = new Date();
    const createdAt = new Date(order.createdAt);
    const hours = (now - createdAt) / (1000 * 60 * 60);
    if (hours >= 6) return { canUrge: true, msg: '催促管理员' };
    const remain = (6 - hours).toFixed(1);
    return { canUrge: false, msg: `${remain}h后可催促` };
  },

  async handleUrge(e) {
    const orderId = e.currentTarget.dataset.id;
    try {
      const res = await post(`/orders/${orderId}/urge`, {});
      wx.showToast({ title: res.message || (res.code === 200 ? '催促成功' : '操作失败'), icon: res.code === 200 ? 'success' : 'none' });
      if (res.code === 200) this.loadOrders();
    } catch {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  async handleWithdraw(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认撤回',
      content: '撤回后报修单将关闭，确认吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await del(`/orders/${orderId}`);
          if (res.code === 200) {
            wx.showToast({ title: '已撤回', icon: 'success' });
            this.loadOrders();
          } else {
            wx.showToast({ title: res.message || '撤回失败', icon: 'none' });
          }
        } catch {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  loadOrders() {
    this.setData({ orders: [], page: 1, hasMore: true }, () => {
      this.fetchOrders();
    });
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },


  onPreviewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  }
});