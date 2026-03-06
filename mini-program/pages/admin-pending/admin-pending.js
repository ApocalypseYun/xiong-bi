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
    filterUrged: false,
    currentOrder: null,
    showModal: false
  },

  onLoad(options) {
    if (options.filter === 'urged') {
      this.setData({ filterUrged: true });
      this.loadUrgedOrders();
    } else {
      this.loadOrders();
    }
  },

  onPullDownRefresh() {
    const loadFn = this.data.filterUrged ? this.loadUrgedOrders : this.loadOrders;
    loadFn.call(this).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShow() {
    if (this.data.filterUrged) {
      this.loadUrgedOrders();
    } else {
      this.loadOrders();
    }
  },

  async loadOrders() {
    this.setData({ loading: true });

    try {
      const res = await request.get('/admin/orders/pending');
      if (res.code === 200) {
        const orders = (res.data || []).map(order => ({
          ...order,
          imageUrls: order.images ? order.images.map(img => img.imageUrl) : []
        }));
        this.setData({ orders });
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

  async loadUrgedOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await request.get('/admin/orders/urged');
      this.setData({ orders: res.code === 200 ? res.data : [] });
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  showOrderDetail(e) {
    const { order } = e.currentTarget.dataset;
    // 处理图片 URL 数组
    const processedOrder = {
      ...order,
      imageUrls: order.images ? order.images.map(img => img.imageUrl) : []
    };
    this.setData({
      currentOrder: processedOrder,
      showModal: true
    });
  },

  closeModal() {
    this.setData({
      showModal: false,
      currentOrder: null
    });
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  }
});
