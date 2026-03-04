// pages/admin-repairman/admin-repairman.js
const { get, post, put, del } = require('../../utils/request');

Page({
  data: {
    repairmen: [],
    showForm: false,
    editingId: null,
    formData: {
      username: '',
      password: '',
      realName: '',
      phone: ''
    },
    errors: {},
    loading: false
  },

  onLoad() {
    this.checkPermission();
    this.loadRepairmen();
  },

  checkPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || userInfo.role !== 'super_admin') {
      wx.showModal({
        title: '权限不足',
        content: '仅超级管理员可访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  async loadRepairmen() {
    this.setData({ loading: true });
    try {
      const res = await get('/super-admin/repairman');
      if (res.code === 200) {
        this.setData({ repairmen: res.data || [] });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  showAddForm() {
    this.setData({
      showForm: true,
      editingId: null,
      formData: { username: '', password: '', realName: '', phone: '' },
      errors: {}
    });
  },

  editRepairman(e) {
    const { id } = e.currentTarget.dataset;
    const repairman = this.data.repairmen.find(r => r.id === id);
    if (repairman) {
      this.setData({
        showForm: true,
        editingId: id,
        formData: {
          username: repairman.username,
          password: '', // 不显示密码
          realName: repairman.realName,
          phone: repairman.phone
        },
        errors: {}
      });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  validateForm() {
    const errors = {};
    const { username, password, realName, phone } = this.data.formData;
    
    if (!username.trim()) errors.username = '请输入用户名';
    if (!this.data.editingId && !password.trim()) errors.password = '请输入密码';
    if (!realName.trim()) errors.realName = '请输入真实姓名';
    if (!phone.trim()) errors.phone = '请输入电话号码';
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) errors.phone = '电话格式不正确';
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async submitForm() {
    if (!this.validateForm()) return;

    const { formData, editingId } = this.data;
    this.setData({ loading: true });

    try {
      const data = { ...formData };
      if (editingId && !data.password) delete data.password; // 编辑时不修改密码

      let res;
      if (editingId) {
        res = await put(`/super-admin/repairman/${editingId}`, data);
      } else {
        res = await post('/super-admin/repairman', data);
      }

      if (res.code === 200) {
        wx.showToast({ title: editingId ? '修改成功' : '添加成功', icon: 'success' });
        this.hideForm();
        this.loadRepairmen();
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  hideForm() {
    this.setData({ showForm: false, editingId: null, formData: {}, errors: {} });
  },

  deleteRepairman(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除维修工"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await del(`/super-admin/repairman/${id}`);
            if (result.code === 200) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadRepairmen();
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
