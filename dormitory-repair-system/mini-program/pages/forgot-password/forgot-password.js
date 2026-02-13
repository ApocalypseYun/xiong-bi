const { post } = require('../../utils/request.js');

Page({
  data: {
    username: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false,
    isLoading: false,
    errors: {},
    isSuccess: false
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      [`errors.${field}`]: ''
    });
  },

  togglePassword(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: !this.data[field]
    });
  },

  validateUsername() {
    const { username } = this.data;
    if (!username.trim()) {
      return '请输入用户名';
    }
    return '';
  },

  validateNewPassword() {
    const { newPassword } = this.data;
    if (!newPassword) {
      return '请输入新密码';
    }
    if (newPassword.length < 6) {
      return '新密码至少6位';
    }
    return '';
  },

  validateConfirmPassword() {
    const { newPassword, confirmPassword } = this.data;
    if (!confirmPassword) {
      return '请确认新密码';
    }
    if (newPassword !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return '';
  },

  validateForm() {
    const errors = {};
    
    const usernameError = this.validateUsername();
    if (usernameError) errors.username = usernameError;
    
    const newPasswordError = this.validateNewPassword();
    if (newPasswordError) errors.newPassword = newPasswordError;
    
    const confirmPasswordError = this.validateConfirmPassword();
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async handleReset() {
    if (!this.validateForm()) {
      return;
    }

    const { username, newPassword, confirmPassword } = this.data;

    this.setData({ isLoading: true });

    try {
      const res = await post('/auth/reset-password', {
        username: username.trim(),
        newPassword,
        confirmPassword
      });

      if (res.code === 200) {
        this.setData({ isSuccess: true });
      } else {
        wx.showToast({
          title: res.message || '密码重置失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goToLogin() {
    wx.navigateBack();
  }
});
