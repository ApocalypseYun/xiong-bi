const API_BASE = 'http://localhost:3000';

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
    this.setData({
      currentTab: tab,
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
            createdAtFormatted: this.formatDate(order.createdAt)
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
      this.setData({
        currentOrder: order,
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


  onPreviewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  }
});