const { post } = require('../../utils/request.js');

Page({
  data: {
    role: 'student',
    username: '',
    password: '',
    confirmPassword: '',
    realName: '',
    phone: '',
    roomNumber: '',
    building: '',
    showPassword: false,
    showConfirmPassword: false,
    isLoading: false,
    errors: {}
  },

  onLoad(options) {
    if (options.role) {
      this.setData({ role: options.role });
    }
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ 
      role,
      errors: {}
    });
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
    return '请输入学号';
    if (username.trim().length < 3) {
      return '学号至少3个字符';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return '学号只能包含字母、数字、下划线和连字符';
    }
    return '';
  },

  validatePassword() {
    const { password } = this.data;
    if (!password) {
      return '请输入密码';
    }
    if (password.length < 6) {
      return '密码至少6位';
    }
    return '';
  },

  validateConfirmPassword() {
    const { password, confirmPassword } = this.data;
    if (!confirmPassword) {
      return '请确认密码';
    }
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return '';
  },

  validatePhone() {
    const { phone, role } = this.data;
    if (role === 'admin') return '';
    if (!phone) {
      return '请输入手机号';
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return '请输入正确的手机号';
    }
    return '';
  },

  validateRoomNumber() {
    const { roomNumber, role } = this.data;
    if (role === 'admin') return '';
    if (!roomNumber.trim()) {
      return '请输入宿舍房间号';
    }
    return '';
  },

  validateRealName() {
    const { realName, role } = this.data;
    if (role === 'admin') return '';
    if (!realName || !realName.trim()) {
      return '请输入真实姓名';
    }
    return '';
  },

  validateForm() {

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
    
    const roomNumberError = this.validateRoomNumber();
    if (roomNumberError) errors.roomNumber = roomNumberError;
    
    const buildingError = this.validateBuilding();
    if (buildingError) errors.building = buildingError;
    
    const realNameError = this.validateRealName();
    if (realNameError) errors.realName = realNameError;
    
    this.setData({ errors });
  },

  async handleRegister() {
    if (!this.validateForm()) {
      return;
    }

    const { 
      role, 
      username, 
      password, 
      confirmPassword, 
      realName, 
      phone, 
      roomNumber, 
      building 
    } = this.data;

    this.setData({ isLoading: true });

    try {
      const data = {
        username: username.trim(),
        password,
        confirmPassword,
        role
      };

      if (role === 'student') {
        data.realName = realName.trim();
        data.phone = phone.trim();
        data.roomNumber = roomNumber.trim();
        data.building = building.trim();
      }

      const res = await post('/auth/register', data);

      if (res.code === 200) {
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        // 处理后端返回的验证失败
        if (res.mismatchedFields && res.mismatchedFields.length > 0) {
          const fieldMap = {
            'username': '学号不匹配',
            'realName': '姓名不匹配',
            'phone': '电话不匹配',
            'building': '楼栋不匹配',
            'roomNumber': '寝室号不匹配'
          };
          const errors = {};
          res.mismatchedFields.forEach(field => {
            errors[field] = fieldMap[field] || `${field}不匹配`;
          });
          this.setData({ errors });
          wx.showToast({
            title: '住户信息验证失败',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: res.message || '注册失败',
            icon: 'none'
          });
        }
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

  },

  goToForgotPassword() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
  }
});
