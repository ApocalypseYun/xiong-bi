
## 2026-02-14: Login/Register/Forgot Password Pages Implementation

### WeChat Mini Program Auth Pages
- Created 3 auth pages with modern, warm gradient design (#667eea to #764ba2)
- Used card-based layout with rounded corners (40rpx) and soft shadows
- Implemented role switcher tabs with smooth transitions for student/admin selection

### Form Validation Patterns
- Real-time validation on blur events
- Error state styling with red borders (#ff6b6b) and background tint
- Password visibility toggle with emoji icons
- Student-specific fields: phone, roomNumber, building (only shown for student role)

### Storage Patterns
- Token storage: wx.setStorageSync('token', token)
- User info storage: wx.setStorageSync('userInfo', user)
- Auto-redirect on app launch if already logged in (checkLoginStatus)

### API Integration
- Used request.js utils with BASE_URL from config
- Login: POST /auth/login → returns { token, user }
- Register: POST /auth/register → role-based fields
- Reset Password: POST /auth/reset-password

### Navigation Patterns
- wx.navigateTo for inner pages (register, forgot-password)
- wx.redirectTo for post-auth navigation (student/admin home)
- wx.navigateBack for returning to login

### UI Animation
- fadeInUp/fadeInDown animations for smooth entrance
- Floating decorative circles with staggered animations
- Shimmer effect on logo icon for visual interest
- Tab switching with shadow and color transitions

### Responsive Design
- @media query for taller screens to center content
- Flexible layouts using flexbox
- RPX units for consistent scaling across devices
