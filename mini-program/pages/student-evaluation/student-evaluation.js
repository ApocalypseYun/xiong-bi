const API_BASE = 'http://localhost:3000';

Page({
  data: {
    orderId: null,
    order: null,
    rating: 0,
    content: '',
    loading: false,
    submitting: false,
    completedOrders: [],
    showOrderSelector: false,
    existingEvaluation: null
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: parseInt(options.orderId) });
      this.fetchOrderDetail(parseInt(options.orderId));
    } else {
      this.fetchCompletedOrders();
    }
  },

  onShow() {
    if (this.data.orderId) {
      this.fetchOrderDetail(this.data.orderId);
    }
  },

  fetchCompletedOrders() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${API_BASE}/api/orders?status=completed`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.data.code === 200) {
          const orders = res.data.data || [];
          this.setData({
            completedOrders: orders.filter(o => !o.evaluation),
            showOrderSelector: orders.length > 0 && !this.data.orderId
          });
          if (orders.length === 0) {
            wx.showModal({
              title: '提示',
              content: '暂无可评价的已完成订单',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
          }
        } else {
          wx.showToast({ title: res.data.message || '获取失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  fetchOrderDetail(orderId) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    wx.request({
      url: `${API_BASE}/api/orders/${orderId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.data.code === 200) {
          const order = res.data.data;
          if (order.status !== 'completed') {
            wx.showModal({
              title: '提示',
              content: '只有已完成的订单可以评价',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
            return;
          }
          if (order.evaluation) {
            this.setData({
              order: order,
              existingEvaluation: order.evaluation,
              rating: order.evaluation.rating,
              content: order.evaluation.comment || order.evaluation.content || ''
            });
          } else {
            this.setData({ order: order });
          }
        } else {
          wx.showToast({ title: res.data.message || '获取失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  onSelectOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.completedOrders.find(o => o.orderId === orderId);
    if (order) {
      this.setData({
        orderId: orderId,
        order: order,
        showOrderSelector: false
      });
    }
  },

  onCloseSelector() {
    if (!this.data.orderId) {
      wx.navigateBack();
    } else {
      this.setData({ showOrderSelector: false });
    }
  },

  onRatingChange(e) {
    const rating = e.currentTarget.dataset.rating;
    if (!this.data.existingEvaluation) {
      this.setData({ rating: parseInt(rating) });
    }
  },

  onContentInput(e) {
    if (!this.data.existingEvaluation) {
      this.setData({ content: e.detail.value });
    }
  },

  onSubmit() {
    if (this.data.existingEvaluation) {
      wx.showToast({ title: '您已评价过此订单', icon: 'none' });
      return;
    }

    if (this.data.rating === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    if (!this.data.orderId) {
      wx.showToast({ title: '请先选择订单', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    wx.request({
      url: `${API_BASE}/api/evaluations`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        orderId: this.data.orderId,
        rating: this.data.rating,
        content: this.data.content
      },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '评价成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.data.message || '评价失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
        this.setData({ submitting: false });
      }
    });
  },

  onSwitchOrder() {
    this.fetchCompletedOrders();
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({
        current: url,
        urls: [url]
      });
    }
  }
});