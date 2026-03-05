const { get, put } = require('../../utils/request.js');

Page({
  data: { orders: [], isLoading: false },

  onLoad() { this.loadOrders(); },
  onShow() { this.loadOrders(); },

  async loadOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/repairman/orders/pending');
      this.setData({ orders: res.code === 200 ? res.data : [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async handleAccept(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认接单',
      content: '确定接下这个报修单吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await put(`/repairman/orders/${orderId}/accept`, {});
          if (res.code === 200) {
            wx.showToast({ title: '接单成功', icon: 'success' });
            this.loadOrders();
          } else {
            wx.showToast({ title: res.message || '接单失败', icon: 'none' });
          }
        } catch (err) {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  }
});
