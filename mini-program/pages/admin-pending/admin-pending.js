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
    showCompleteModal: false,
    completionImages: [],
    uploadLoading: false,
    submitting: false
  },

  onLoad() {
    this.loadPendingOrders();
  },

  onPullDownRefresh() {
    this.loadPendingOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShow() {
    this.loadPendingOrders();
  },

  async loadPendingOrders() {
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

  async acceptOrder(e) {
    const { orderId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认接单',
      content: '确定要接收此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            const result = await request.put(`/admin/orders/${orderId}/accept`);
            wx.hideLoading();
            
            if (result.code === 200) {
              wx.showToast({
                title: '接单成功',
                icon: 'success'
              });
              this.loadPendingOrders();
              this.closeModal();
            } else {
              wx.showToast({
                title: result.message || '接单失败',
                icon: 'none'
              });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  showCompleteModal(e) {
    const { order } = e.currentTarget.dataset;
    this.setData({
      currentOrder: order,
      showCompleteModal: true,
      completionImages: []
    });
  },

  closeCompleteModal() {
    this.setData({
      showCompleteModal: false,
      currentOrder: null,
      completionImages: []
    });
  },

  chooseCompletionImages() {
    const { completionImages } = this.data;
    const remainCount = 3 - completionImages.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传3张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadCompletionImages(res.tempFilePaths);
      }
    });
  },

  async uploadCompletionImages(filePaths) {
    this.setData({ uploadLoading: true });
    const token = wx.getStorageSync('token');
    const uploadedUrls = [];

    try {
      for (const filePath of filePaths) {
        const res = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: 'http://localhost:3000/api/upload/completion',
            filePath: filePath,
            name: 'image',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: resolve,
            fail: reject
          });
        });

        const data = JSON.parse(res.data);
        if (data.code === 200 && data.data && data.data.urls) {
          uploadedUrls.push(...data.data.urls);
        }
      }

      const currentImages = this.data.completionImages;
      this.setData({
        completionImages: [...currentImages, ...uploadedUrls]
      });

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (err) {
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploadLoading: false });
    }
  },

  removeCompletionImage(e) {
    const { index } = e.currentTarget.dataset;
    const { completionImages } = this.data;
    completionImages.splice(index, 1);
    this.setData({ completionImages });
  },

  previewCompletionImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.completionImages
    });
  },

  async submitCompleteOrder() {
    const { currentOrder, completionImages } = this.data;
    
    if (completionImages.length === 0) {
      wx.showToast({
        title: '请上传完成凭证',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const res = await request.put(`/admin/orders/${currentOrder.orderId}/complete`, {
        completionImageUrls: completionImages
      });

      if (res.code === 200) {
        wx.showToast({
          title: '报修完成',
          icon: 'success'
        });
        this.closeCompleteModal();
        this.loadPendingOrders();
      } else {
        wx.showToast({
          title: res.message || '提交失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  }
});
