(function(){
    const app=document.querySelector('#app')
    if(!app||!app.__vue_app__){console.error('no vue app');return}
    const pinia=app.__vue_app__.config.globalProperties.$pinia
    const s=pinia.state.value.main
    s.componentData=[
        { id:'header-bg',component:'RectShape',label:'矩形',icon:'juxing',propValue:' ',style:{ width:1200,height:200,top:0,left:0,rotate:0,opacity:1,backgroundColor:'#1677ff',borderWidth:0,borderColor:'',borderStyle:'solid',borderRadius:'0px',fontSize:14,fontWeight:400,lineHeight:'',letterSpacing:0,textAlign:'center',color:'',verticalAlign:'middle' },animations:[],events:{},groupStyle:{},isLock:true,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'t1',component:'VText',label:'文字',icon:'wenben',propValue:'武理机器人社团 招新啦！',style:{ width:800,height:60,top:50,left:200,rotate:0,opacity:1,fontSize:42,fontWeight:800,lineHeight:'',letterSpacing:2,textAlign:'center',color:'#ffffff',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'t2',component:'VText',label:'文字',icon:'wenben',propValue:'用代码创造无限可能 2026秋季招新',style:{ width:600,height:36,top:145,left:300,rotate:0,opacity:1,fontSize:18,fontWeight:400,lineHeight:'',letterSpacing:4,textAlign:'center',color:'#e0eaff',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'img1',component:'Picture',label:'图片',icon:'tupian',propValue:{ url:'https://placehold.co/600x300/1677ff/ffffff?text=社团活动照片',flip:{ horizontal:false,vertical:false } },style:{ width:600,height:300,top:240,left:300,rotate:0,opacity:1,borderRadius:'12px' },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info-bg',component:'RectShape',label:'矩形',icon:'juxing',propValue:' ',style:{ width:800,height:260,top:570,left:200,rotate:0,opacity:1,backgroundColor:'#ffffff',borderWidth:0,borderColor:'',borderStyle:'solid',borderRadius:'16px',fontSize:14,fontWeight:400,lineHeight:'',letterSpacing:0,textAlign:'center',color:'',verticalAlign:'middle' },animations:[],events:{},groupStyle:{},isLock:true,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info-t',component:'VText',label:'文字',icon:'wenben',propValue:'招新详情',style:{ width:400,height:40,top:585,left:400,rotate:0,opacity:1,fontSize:22,fontWeight:700,lineHeight:'',letterSpacing:0,textAlign:'center',color:'#1677ff',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'line1',component:'LineShape',label:'直线',icon:'zhixian',propValue:'',style:{ width:700,height:2,top:625,left:250,rotate:0,opacity:1,backgroundColor:'#e0eaff' },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info1',component:'VText',label:'文字',icon:'wenben',propValue:'招新时间：9月15日 - 9月20日',style:{ width:500,height:32,top:645,left:350,rotate:0,opacity:1,fontSize:16,fontWeight:500,lineHeight:'',letterSpacing:1,textAlign:'left',color:'#333333',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info2',component:'VText',label:'文字',icon:'wenben',propValue:'招新部门：软件开发部 / 硬件部 / 竞赛部 / 宣传部',style:{ width:600,height:32,top:685,left:300,rotate:0,opacity:1,fontSize:16,fontWeight:500,lineHeight:'',letterSpacing:1,textAlign:'left',color:'#333333',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info3',component:'VText',label:'文字',icon:'wenben',propValue:'面向对象：2026级全体新生（零基础也可）',style:{ width:550,height:32,top:725,left:325,rotate:0,opacity:1,fontSize:16,fontWeight:500,lineHeight:'',letterSpacing:1,textAlign:'left',color:'#333333',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'info4',component:'VText',label:'文字',icon:'wenben',propValue:'报名方式：扫码下方二维码进群',style:{ width:500,height:32,top:765,left:350,rotate:0,opacity:1,fontSize:16,fontWeight:500,lineHeight:'',letterSpacing:1,textAlign:'left',color:'#333333',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'btn1',component:'VButton',label:'按钮',icon:'button',propValue:'立即报名',style:{ width:200,height:50,top:820,left:500,rotate:0,opacity:1,fontSize:18,fontWeight:700,lineHeight:'',letterSpacing:2,textAlign:'center',color:'#ffffff',backgroundColor:'#1677ff',borderWidth:0,borderColor:'',borderRadius:'25px' },animations:[],events:{ onClick:'https://wj.qq.com' },groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'star1',component:'SVGStar',label:'星形',icon:'kongxinputao',propValue:'',style:{ width:40,height:40,top:230,left:100,rotate:0,opacity:0.6,fontSize:14,fontWeight:400,lineHeight:'',letterSpacing:0,textAlign:'center',color:'#ffd666',borderColor:'#ffd666',backgroundColor:'#ffd666' },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'star2',component:'SVGStar',label:'星形',icon:'kongxinputao',propValue:'',style:{ width:28,height:28,top:260,left:1050,rotate:15,opacity:0.5,fontSize:14,fontWeight:400,lineHeight:'',letterSpacing:0,textAlign:'center',color:'#ffd666',borderColor:'#ffd666',backgroundColor:'#ffd666' },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
        { id:'footer',component:'VText',label:'文字',icon:'wenben',propValue:'武汉理工大学 机器人社团 2026秋季招新',style:{ width:500,height:24,top:875,left:350,rotate:0,opacity:1,fontSize:12,fontWeight:400,lineHeight:'',letterSpacing:2,textAlign:'center',color:'#999999',padding:4 },animations:[],events:{},groupStyle:{},isLock:false,collapseName:'style',linkage:{ duration:0,data:[] } },
    ]
    s.canvasStyleData={ width:1200,height:900,scale:100,color:'#000',opacity:1,backgroundColor:'#f0f7ff',fontSize:14 }
    localStorage.setItem('canvasData',JSON.stringify(s.componentData))
    localStorage.setItem('canvasStyle',JSON.stringify(s.canvasStyleData))

    // 测试 Zod 校验
    try {
        const raw = localStorage.getItem('canvasData')
        const parsed = JSON.parse(raw)
        console.log('[DEBUG] localStorage 数据长度:', raw.length)
        console.log('[DEBUG] JSON.parse 成功, 数组长度:', parsed.length)
        // 尝试找到 Zod schema
        const schemas = window.__VITE_DEV_SERVER__ ? 'dev' : 'prod'
        console.log('[DEBUG] 环境:', schemas)
    } catch(e) {
        console.error('[DEBUG] JSON.parse 失败:', e.message)
    }

    console.log('done, '+s.componentData.length+' components loaded')
})()
