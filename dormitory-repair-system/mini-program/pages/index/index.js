const { post } = require('../../utils/request.js');

Page({
  data: {
    role: 'student',
    username: '',
    password: '',
    showPassword: false,
    usernameFocus: false,
    passwordFocus: false,
    isLoading: false,
    errors: {
      username: '',
      password: ''
    }
  },

  onLoad() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.redirectByRole(userInfo.role);
    }
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value,
      'errors.username': ''
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      'errors.password': ''
    });
  },

  onUsernameFocus() {
    this.setData({ usernameFocus: true });
  },

  onUsernameBlur() {
    this.setData({ usernameFocus: false });
    this.validateUsername();
  },

  onPasswordFocus() {
    this.setData({ passwordFocus: true });
  },

  onPasswordBlur() {
    this.setData({ passwordFocus: false });
    this.validatePassword();
  },

  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  validateUsername() {
    const { username } = this.data;
    if (!username.trim()) {
      this.setData({
        'errors.username': '请输入用户名'
      });
      return false;
    }
    if (username.trim().length < 3) {
      this.setData({
        'errors.username': '用户名至少3个字符'
      });
      return false;
    }
    return true;
  },

  validatePassword() {
    const { password } = this.data;
    if (!password) {
      this.setData({
        'errors.password': '请输入密码'
      });
      return false;
    }
    if (password.length < 6) {
      this.setData({
        'errors.password': '密码至少6位'
      });
      return false;
    }
    return true;
  },

  validateForm() {
    const isUsernameValid = this.validateUsername();
    const isPasswordValid = this.validatePassword();
    return isUsernameValid && isPasswordValid;
  },

  async handleLogin() {
    if (!this.validateForm()) {
      return;
    }

    const { username, password, role } = this.data;

    this.setData({ isLoading: true });

    try {
      const res = await post('/auth/login', {
        username: username.trim(),
        password,
        role
      });

      if (res.code === 200) {
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.user);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          this.redirectByRole(role);
        }, 1500);
      } else {
        wx.showToast({
          title: res.message || '登录失败',
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

  redirectByRole(role) {
    if (role === 'admin') {
      wx.redirectTo({
        url: '/pages/admin/admin'
      });
    } else {
      wx.redirectTo({
        url: '/pages/student/student'
      });
    }
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  goToForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password'
    });
  }
});
