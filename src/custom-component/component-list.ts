import type { ComponentTemplate, ComponentStyle, ComponentData } from '@/types'

/**
 * 公共样式
 */
export const commonStyle: Pick<ComponentStyle, 'rotate' | 'opacity'> = {
    rotate: 0,
    opacity: 1,
}

/**
 * 公共属性
 */
export const commonAttr = {
    animations: [] as never[],
    events: {} as Record<string, string>,
    groupStyle: {} as Record<string, unknown>,
    isLock: false,
    parentId: null as string | null,
    slot: 'default',
    zIndex: 0,
    collapseName: 'style',
    linkage: {
        duration: 0,
        data: [
            {
                id: '',
                label: '',
                event: '',
                style: [{ key: '', value: '' }],
            },
        ],
    },
}

/**
 * 编辑器左侧组件列表
 */
const list: ComponentTemplate[] = [
    {
        component: 'VText',
        label: '文字',
        propValue: '双击编辑文字',
        icon: 'wenben',
        request: {
            method: 'GET',
            data: [],
            url: '',
            series: false,
            time: 1000,
            paramType: '',
            requestCount: 0,
        },
        style: {
            width: 200,
            height: 28,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: undefined,
            color: '',
            padding: 4,
        },
    },
    {
        component: 'VButton',
        label: '按钮',
        propValue: '按钮',
        icon: 'button',
        style: {
            width: 100,
            height: 34,
            borderWidth: 1,
            borderColor: '',
            borderRadius: '',
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: undefined,
            color: '',
            backgroundColor: '',
        },
    },
    {
        component: 'Picture',
        label: '图片',
        icon: 'tupian',
        propValue: {
            url: new URL('../assets/title.jpg', import.meta.url).href,
            flip: {
                horizontal: false,
                vertical: false,
            },
        },
        style: {
            width: 300,
            height: 200,
            borderRadius: '',
        },
    },
    {
        component: 'RectShape',
        label: '矩形',
        propValue: '&nbsp;',
        icon: 'juxing',
        style: {
            width: 200,
            height: 200,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: 'center',
            color: '',
            borderColor: '#000',
            borderWidth: 1,
            backgroundColor: '',
            borderStyle: 'solid',
            borderRadius: '',
            verticalAlign: 'middle',
        },
    },
    {
        component: 'LineShape',
        label: '直线',
        propValue: '',
        icon: 'zhixian',
        style: {
            width: 200,
            height: 2,
            backgroundColor: '#000',
        },
    },
    {
        component: 'CircleShape',
        label: '圆形',
        propValue: '&nbsp;',
        icon: '24gl-circle',
        style: {
            width: 200,
            height: 200,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: 'center',
            color: '',
            borderColor: '#000',
            borderWidth: 1,
            backgroundColor: '',
            borderStyle: 'solid',
            borderRadius: '50%',
            verticalAlign: 'middle',
        },
    },
    {
        component: 'SVGStar',
        label: '星形',
        icon: 'kongxinputao',
        propValue: '',
        style: {
            width: 80,
            height: 80,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: 'center',
            color: '',
            borderColor: '#000',
            backgroundColor: 'rgba(255, 255, 255, 1)',
        },
    },
    {
        component: 'SVGTriangle',
        label: '三角形',
        icon: 'xingzhuang-sanjiaoxing',
        propValue: '',
        style: {
            width: 80,
            height: 80,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: '',
            letterSpacing: 0,
            textAlign: 'center',
            color: '',
            borderColor: '#000',
            backgroundColor: 'rgba(255, 255, 255, 1)',
        },
    },
    {
        component: 'VTable',
        label: '表格',
        icon: 'biaoge',
        propValue: {
            data: [
                ['表头1', '表头2', '表头3'],
                ['内容1', '内容2', '内容3'],
            ],
            stripe: true,
            thBold: true,
        },
        request: {
            method: 'GET',
            data: [],
            url: '',
            series: false,
            time: 1000,
            paramType: '',
            requestCount: 0,
        },
        style: {
            width: 600,
            height: 200,
            fontSize: 14,
            fontWeight: 400,
            textAlign: 'center',
            color: '',
            backgroundColor: 'rgba(255, 255, 255, 1)',
        },
    },
    {
        component: 'VChart',
        label: '图表',
        icon: 'DataAnalysis',
        propValue: {
            chart: 'VChart',
            option: {
                title: {
                    text: '柱状图',
                    show: true,
                },
                legend: {
                    show: true,
                },
                tooltip: {
                    show: true,
                    trigger: 'item',
                },
                xAxis: {
                    show: true,
                    data: ['A', 'B', 'C', 'D', 'E'],
                },
                yAxis: {
                    show: true,
                },
                series: {
                    type: 'bar',
                    name: '销量',
                    data: [23, 61, 35, 77, 35],
                    itemStyle: {
                        barBorderRadius: 5,
                        borderWidth: 1,
                        borderType: 'solid',
                        borderColor: '#73c0de',
                        shadowColor: '#5470c6',
                        shadowBlur: 3,
                    },
                },
            },
        },
        style: {
            width: 800,
            height: 500,
            borderRadius: '',
        },
    },
]

// 合并公共样式和属性
for (let i = 0, len = list.length; i < len; i++) {
    const item = list[i]
    item.style = { ...commonStyle, ...item.style } as ComponentStyle
    list[i] = { ...commonAttr, ...item } as unknown as ComponentData
}

export default list as ComponentData[]
