// 社团招新宣传页 - 在浏览器控制台粘贴执行
// 步骤：打开 http://localhost:8080/ → F12 → Console → 粘贴此代码 → 回车 → 手动刷新页面(F5)

const components = [
    // ===== 顶部蓝色横幅 =====
    {
        id: 'header-bg',
        component: 'RectShape',
        label: '矩形',
        icon: 'juxing',
        propValue: ' ',
        style: {
            width: 1200, height: 200, top: 0, left: 0,
            rotate: 0, opacity: 1,
            backgroundColor: '#1677ff',
            borderWidth: 0, borderColor: '', borderStyle: 'solid', borderRadius: '0px',
            fontSize: 14, fontWeight: 400, lineHeight: '', letterSpacing: 0,
            textAlign: 'center', color: '', verticalAlign: 'middle',
        },
        animations: [], events: {}, groupStyle: {}, isLock: true,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 主标题 =====
    {
        id: 'title-main',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F680} 武理机器人社团 招新啦！',
        style: {
            width: 800, height: 60, top: 50, left: 200,
            rotate: 0, opacity: 1,
            fontSize: 42, fontWeight: 800, lineHeight: '', letterSpacing: 2,
            textAlign: 'center', color: '#ffffff', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 副标题 =====
    {
        id: 'title-sub',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '用代码创造无限可能 · 2026秋季招新',
        style: {
            width: 600, height: 36, top: 145, left: 300,
            rotate: 0, opacity: 1,
            fontSize: 18, fontWeight: 400, lineHeight: '', letterSpacing: 4,
            textAlign: 'center', color: '#e0eaff', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 宣传图片占位 =====
    {
        id: 'hero-img',
        component: 'Picture',
        label: '图片',
        icon: 'tupian',
        propValue: { url: 'https://placehold.co/600x300/1677ff/ffffff?text=社团活动照片', flip: { horizontal: false, vertical: false } },
        style: {
            width: 600, height: 300, top: 240, left: 300,
            rotate: 0, opacity: 1, borderRadius: '12px',
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 信息卡片背景 =====
    {
        id: 'info-bg',
        component: 'RectShape',
        label: '矩形',
        icon: 'juxing',
        propValue: ' ',
        style: {
            width: 800, height: 260, top: 570, left: 200,
            rotate: 0, opacity: 1,
            backgroundColor: '#ffffff',
            borderWidth: 0, borderColor: '', borderStyle: 'solid', borderRadius: '16px',
            fontSize: 14, fontWeight: 400, lineHeight: '', letterSpacing: 0,
            textAlign: 'center', color: '', verticalAlign: 'middle',
        },
        animations: [], events: {}, groupStyle: {}, isLock: true,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 招新详情标题 =====
    {
        id: 'info-title',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F4CB} 招新详情',
        style: {
            width: 400, height: 40, top: 585, left: 400,
            rotate: 0, opacity: 1,
            fontSize: 22, fontWeight: 700, lineHeight: '', letterSpacing: 0,
            textAlign: 'center', color: '#1677ff', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 分割线 =====
    {
        id: 'divider',
        component: 'LineShape',
        label: '直线',
        icon: 'zhixian',
        propValue: '',
        style: {
            width: 700, height: 2, top: 625, left: 250,
            rotate: 0, opacity: 1, backgroundColor: '#e0eaff',
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 招新时间 =====
    {
        id: 'info-time',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F550} 招新时间：9月15日 - 9月20日',
        style: {
            width: 500, height: 32, top: 645, left: 350,
            rotate: 0, opacity: 1,
            fontSize: 16, fontWeight: 500, lineHeight: '', letterSpacing: 1,
            textAlign: 'left', color: '#333333', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 招新部门 =====
    {
        id: 'info-dept',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F3F7}️ 招新部门：软件开发部 / 硬件部 / 竞赛部 / 宣传部',
        style: {
            width: 600, height: 32, top: 685, left: 300,
            rotate: 0, opacity: 1,
            fontSize: 16, fontWeight: 500, lineHeight: '', letterSpacing: 1,
            textAlign: 'left', color: '#333333', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 面向对象 =====
    {
        id: 'info-target',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F468}‍\u{1F393} 面向对象：2026级全体新生（零基础也可）',
        style: {
            width: 550, height: 32, top: 725, left: 325,
            rotate: 0, opacity: 1,
            fontSize: 16, fontWeight: 500, lineHeight: '', letterSpacing: 1,
            textAlign: 'left', color: '#333333', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 报名方式 =====
    {
        id: 'info-signup',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '\u{1F4F1} 报名方式：扫码下方二维码进群',
        style: {
            width: 500, height: 32, top: 765, left: 350,
            rotate: 0, opacity: 1,
            fontSize: 16, fontWeight: 500, lineHeight: '', letterSpacing: 1,
            textAlign: 'left', color: '#333333', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 报名按钮 =====
    {
        id: 'signup-btn',
        component: 'VButton',
        label: '按钮',
        icon: 'button',
        propValue: '立即报名 →',
        style: {
            width: 200, height: 50, top: 820, left: 500,
            rotate: 0, opacity: 1,
            fontSize: 18, fontWeight: 700, lineHeight: '', letterSpacing: 2,
            textAlign: 'center', color: '#ffffff',
            backgroundColor: '#1677ff',
            borderWidth: 0, borderColor: '', borderRadius: '25px',
        },
        animations: [], events: { onClick: 'https://wj.qq.com' }, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 装饰星星 =====
    {
        id: 'star1',
        component: 'SVGStar',
        label: '星形',
        icon: 'kongxinputao',
        propValue: '',
        style: {
            width: 40, height: 40, top: 230, left: 100,
            rotate: 0, opacity: 0.6,
            fontSize: 14, fontWeight: 400, lineHeight: '', letterSpacing: 0,
            textAlign: 'center', color: '#ffd666', borderColor: '#ffd666', backgroundColor: '#ffd666',
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    {
        id: 'star2',
        component: 'SVGStar',
        label: '星形',
        icon: 'kongxinputao',
        propValue: '',
        style: {
            width: 28, height: 28, top: 260, left: 1050,
            rotate: 15, opacity: 0.5,
            fontSize: 14, fontWeight: 400, lineHeight: '', letterSpacing: 0,
            textAlign: 'center', color: '#ffd666', borderColor: '#ffd666', backgroundColor: '#ffd666',
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
    // ===== 页脚 =====
    {
        id: 'footer',
        component: 'VText',
        label: '文字',
        icon: 'wenben',
        propValue: '武汉理工大学 · 机器人社团 · 2026秋季招新',
        style: {
            width: 500, height: 24, top: 875, left: 350,
            rotate: 0, opacity: 1,
            fontSize: 12, fontWeight: 400, lineHeight: '', letterSpacing: 2,
            textAlign: 'center', color: '#999999', padding: 4,
        },
        animations: [], events: {}, groupStyle: {}, isLock: false,
        collapseName: 'style',
        linkage: { duration: 0, data: [] },
    },
]

const canvasStyle = {
    width: 1200, height: 900, scale: 100,
    color: '#000', opacity: 1,
    backgroundColor: '#f0f7ff', fontSize: 14,
}

// 写入 localStorage
localStorage.setItem('canvasData', JSON.stringify(components))
localStorage.setItem('canvasStyle', JSON.stringify(canvasStyle))

console.log('✅ 数据已写入 localStorage，请手动刷新页面 (F5)')
console.log('共 ' + components.length + ' 个组件')
