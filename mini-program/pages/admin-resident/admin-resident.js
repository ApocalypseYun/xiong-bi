// pages/admin-resident/admin-resident.js
const { get, post, put, del } = require('../../utils/request');

Page({
  data: {
    residents: [],
    searchKey: '',
    showForm: false,
    editingId: null,
    formData: {
      studentId: '',
      name: '',
      phone: '',
      building: '',
      roomNumber: ''
    },
    errors: {},
    loading: false,
    uploading: false
  },

  onLoad() {
    this.checkPermission();
    this.loadResidents();
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

  async loadResidents() {
    this.setData({ loading: true });
    try {
      const { searchKey } = this.data;
      const url = searchKey ? `/super-admin/resident?studentId=${searchKey}` : '/super-admin/resident';
      const res = await get(url);
      if (res.code === 200) {
        this.setData({ residents: res.data || [] });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSearch(e) {
    this.setData({ searchKey: e.detail.value });
    this.loadResidents();
  },

  showAddForm() {
    this.setData({
      showForm: true,
      editingId: null,
      formData: { studentId: '', name: '', phone: '', building: '', roomNumber: '' },
      errors: {}
    });
  },

  editResident(e) {
    const { id } = e.currentTarget.dataset;
    const resident = this.data.residents.find(r => r.id === id);
    if (resident) {
      this.setData({
        showForm: true,
        editingId: id,
        formData: {
          studentId: resident.studentId,
          name: resident.name,
          phone: resident.phone,
          building: resident.building,
          roomNumber: resident.roomNumber
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
    const { studentId, name, phone, building, roomNumber } = this.data.formData;
    
    if (!studentId.trim()) errors.studentId = '请输入学号';
    if (!name.trim()) errors.name = '请输入姓名';
    if (!phone.trim()) errors.phone = '请输入电话';
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) errors.phone = '电话格式不正确';
    if (!building.trim()) errors.building = '请输入楼栋';
    if (!roomNumber.trim()) errors.roomNumber = '请输入寝室号';
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async submitForm() {
    if (!this.validateForm()) return;

    const { formData, editingId } = this.data;
    this.setData({ loading: true });

    try {
      let res;
      if (editingId) {
        res = await put(`/super-admin/resident/${editingId}`, formData);
      } else {
        res = await post('/super-admin/resident', formData);
      }

      if (res.code === 200) {
        wx.showToast({ title: editingId ? '修改成功' : '添加成功', icon: 'success' });
        this.hideForm();
        this.loadResidents();
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

  deleteResident(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除住户"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await del(`/super-admin/resident/${id}`);
            if (result.code === 200) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadResidents();
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  async importExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].path;
        this.setData({ uploading: true });

        wx.uploadFile({
          url: getApp().globalData.baseUrl + '/super-admin/resident/import',
          filePath: tempFilePath,
          name: 'file',
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token')
          },
          success: (uploadRes) => {
            const data = JSON.parse(uploadRes.data);
            if (data.code === 200) {
              const { successCount, failedCount, errors } = data.data;
              let message = `成功导入${successCount}条`;
              if (failedCount > 0) {
                message += `，失败${failedCount}条`;
              }
              wx.showModal({
                title: '导入完成',
                content: message,
                showCancel: false,
                success: () => {
                  this.loadResidents();
                }
              });
            } else {
              wx.showToast({ title: data.message || '导入失败', icon: 'none', duration: 2000 });
            }
          },
          fail: () => {
            wx.showToast({ title: '上传失败', icon: 'none' });
          },
          complete: () => {
            this.setData({ uploading: false });
          }
        });
      }
    });
  }
});
