const { get, put } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    realName: '',
    phone: '',
    roomNumber: '',
    building: '',
    loading: false,
    saving: false
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    this.setData({ loading: true });
    
    try {
      const res = await get('/user/profile');
      if (res.code === 200) {
        const user = res.data;
        this.setData({
          userInfo: user,
          realName: user.realName || '',
          phone: user.phone || '',
          roomNumber: user.roomNumber || '',
          building: user.building || ''
        });
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRealNameInput(e) {
    this.setData({ realName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onRoomNumberInput(e) {
    this.setData({ roomNumber: e.detail.value });
  },

  onBuildingInput(e) {
    this.setData({ building: e.detail.value });
  },

  validatePhone() {
    const { phone } = this.data;
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return '手机号格式不正确';
    }
    return '';
  },

  async handleSave() {
    const { realName, phone, roomNumber, building } = this.data;

    // 验证手机号
    const phoneError = this.validatePhone();
    if (phoneError) {
      wx.showToast({ title: phoneError, icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await put('/user/profile', {
        realName: realName.trim() || null,
        phone: phone.trim() || null,
        roomNumber: roomNumber.trim() || null,
        building: building.trim() || null
      });

      if (res.code === 200) {
        // 更新本地存储
        wx.setStorageSync('userInfo', res.data);
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  }
});
