const request = require('../../utils/request');

const statusMap = {
  'pending': { text: '待处理', color: '#f5a623', bgColor: '#fff7e6' },
  'processing': { text: '处理中', color: '#4a90d9', bgColor: '#e6f2ff' },
  'completed': { text: '已完成', color: '#7ed321', bgColor: '#e8f5e0' }
};

const repairTypeMap = {
  '水电维修': '⚡',
  '门窗维修': '🚪',
  '家具维修': '🪑',
  '网络问题': '📡',
  '其他': '🔧'
};

Page({
  data: {
    orders: [],
    loading: false,
    currentOrder: null,
    showModal: false,
    startDate: '',
    endDate: '',
    evaluationLabels: ['非常不满意', '不满意', '一般', '满意', '非常满意']
  },

  onLoad() {
    this.initDateRange();
    this.loadCompletedOrders();
  },

  onPullDownRefresh() {
    this.loadCompletedOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShow() {
    this.loadCompletedOrders();
  },

  initDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.setData({
      startDate: formatDate(thirtyDaysAgo),
      endDate: formatDate(today)
    });
  },

  async loadCompletedOrders() {
    this.setData({ loading: true });
    
    try {
      const { startDate, endDate } = this.data;
      const res = await request.get('/admin/orders', {
        startDate,
        endDate
      });
      
      if (res.code === 200) {
        const completedOrders = (res.data || []).filter(order => order.status === 'completed');
        this.setData({ orders: completedOrders });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  searchOrders() {
    const { startDate, endDate } = this.data;
    
    if (new Date(startDate) > new Date(endDate)) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }
    
    this.loadCompletedOrders();
  },

  resetDateFilter() {
    this.initDateRange();
    this.loadCompletedOrders();
  },

  showOrderDetail(e) {
    const { order } = e.currentTarget.dataset;
    this.setData({
      currentOrder: order,
      showModal: true
    });
  },

  closeModal() {
    this.setData({
      showModal: false,
      currentOrder: null
    });
  },

  preventBubble() {
    // Prevent modal from closing when clicking content
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  },

  formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
});
