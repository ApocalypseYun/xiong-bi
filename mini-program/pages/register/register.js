const { post } = require('../../utils/request.js');

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    realName: '',
    phone: '',
    roomNumber: '',
    building: '',
    qqEmail: '',
    showPassword: false,
    showConfirmPassword: false,
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

  togglePassword(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: !this.data[field] });
  },

  validateUsername() {
    const { username } = this.data;
    if (!username.trim()) return '请输入学号';
    if (username.trim().length < 3) return '学号至少3个字符';
    return '';
  },

  validatePassword() {
    const { password } = this.data;
    if (!password) return '请输入密码';
    if (password.length < 6) return '密码至少6位';
    return '';
  },

  validateConfirmPassword() {
    const { password, confirmPassword } = this.data;
    if (!confirmPassword) return '请确认密码';
    if (password !== confirmPassword) return '两次输入的密码不一致';
    return '';
  },

  validatePhone() {
    const { phone } = this.data;
    if (!phone) return '请输入手机号';
    if (!/^1[3-9]\d{9}$/.test(phone)) return '请输入正确的手机号';
    return '';
  },

  validateQQEmail() {
    const { qqEmail } = this.data;
    if (!qqEmail) return '请输入QQ邮箱';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qqEmail)) return '请输入正确的邮箱格式';
    return '';
  },

  validateForm() {
    const errors = {};
    const usernameError = this.validateUsername();
    if (usernameError) errors.username = usernameError;
    const passwordError = this.validatePassword();
    if (passwordError) errors.password = passwordError;
    const confirmPasswordError = this.validateConfirmPassword();
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    const phoneError = this.validatePhone();
    if (phoneError) errors.phone = phoneError;
    const roomNumberError = this.data.roomNumber.trim() ? '' : '请输入宿舍房间号';
    if (roomNumberError) errors.roomNumber = roomNumberError;
    const buildingError = this.data.building.trim() ? '' : '请输入宿舍楼栋';
    if (buildingError) errors.building = buildingError;
    const realNameError = this.data.realName.trim() ? '' : '请输入真实姓名';
    if (realNameError) errors.realName = realNameError;
    const qqEmailError = this.validateQQEmail();
    if (qqEmailError) errors.qqEmail = qqEmailError;
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async handleRegister() {
    if (!this.validateForm()) return;

    const { username, password, confirmPassword, realName, phone, roomNumber, building, qqEmail } = this.data;
    this.setData({ isLoading: true });

    try {
      const res = await post('/auth/register', {
        username: username.trim(),
        password,
        confirmPassword,
        realName: realName.trim(),
        phone: phone.trim(),
        roomNumber: roomNumber.trim(),
        building: building.trim(),
        qqEmail: qqEmail.trim()
      });

      if (res.code === 200) {
        wx.showToast({ title: '注册成功', icon: 'success', duration: 1500 });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.message || '注册失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: err.message || '网络错误，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
