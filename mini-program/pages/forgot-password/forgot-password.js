const { post } = require('../../utils/request.js');

Page({
  data: {
    username: '',
    realName: '',
    phone: '',
    building: '',
    roomNumber: '',
    qqEmail: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    errors: {}
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      [`errors.${field}`]: ''
    });
  },

  validateForm() {
    const errors = {};
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = this.data;
    if (!username.trim()) errors.username = '请输入学号';
    if (!realName.trim()) errors.realName = '请输入姓名';
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) errors.phone = '请输入正确的手机号';
    if (!building.trim()) errors.building = '请输入栋数';
    if (!roomNumber.trim()) errors.roomNumber = '请输入寝室号';
    if (!qqEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qqEmail)) errors.qqEmail = '请输入正确的邮箱';
    if (!newPassword || newPassword.length < 6) errors.newPassword = '密码至少6位';
    if (newPassword !== confirmPassword) errors.confirmPassword = '两次密码不一致';
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async handleReset() {
    if (!this.validateForm()) return;
    const { username, realName, phone, building, roomNumber, qqEmail, newPassword, confirmPassword } = this.data;
    this.setData({ isLoading: true });
    try {
      const res = await post('/auth/reset-password', {
        username: username.trim(),
        realName: realName.trim(),
        phone: phone.trim(),
        building: building.trim(),
        roomNumber: roomNumber.trim(),
        qqEmail: qqEmail.trim(),
        newPassword,
        confirmPassword
      });
      if (res.code === 200) {
        wx.showToast({ title: '密码重置成功', icon: 'success', duration: 1500 });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.message || '重置失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
