import { useStore } from '@/store'
import type { ComponentStyle } from '@/types'

/**
 * 点坐标接口
 */
interface Point {
  x: number
  y: number
}

/**
 * 角度转弧度
 * @param angle 角度值
 * @returns 弧度值
 */
function angleToRadian(angle: number): number {
    return (angle * Math.PI) / 180
}

/**
 * 计算根据圆心旋转后的点的坐标
 * @param point 旋转前的点坐标
 * @param center 旋转中心
 * @param rotate 旋转的角度
 * @returns 旋转后的坐标
 * @see https://www.zhihu.com/question/67425734/answer/252724399 旋转矩阵公式
 */
export function calculateRotatedPointCoordinate(
    point: Point,
    center: Point,
    rotate: number,
): Point {
    /**
   * 旋转公式：
   *  点a(x, y)
   *  旋转中心c(x, y)
   *  旋转后点n(x, y)
   *  旋转角度θ
   * nx = cosθ * (ax - cx) - sinθ * (ay - cy) + cx
   * ny = sinθ * (ax - cx) + cosθ * (ay - cy) + cy
   */
    const radian = angleToRadian(rotate)
    return {
        x:
      (point.x - center.x) * Math.cos(radian) -
      (point.y - center.y) * Math.sin(radian) +
      center.x,
        y:
      (point.x - center.x) * Math.sin(radian) +
      (point.y - center.y) * Math.cos(radian) +
      center.y,
    }
}

/**
 * 控制点名称类型
 */
type PointName = 't' | 'b' | 'l' | 'r' | 'lt' | 'rt' | 'lb' | 'rb'

/**
 * 获取旋转后的点坐标（八个控制点之一）
 * @param style 组件样式
 * @param center 组件中心点
 * @param name 点名称
 * @returns 旋转后的点坐标
 */
export function getRotatedPointCoordinate(
    style: Required<Pick<ComponentStyle, 'left' | 'top' | 'width' | 'height' | 'rotate'>>,
    center: Point,
    name: PointName,
): Point {
    let point: Point

    switch (name) {
        case 't': // 上中
            point = {
                x: style.left + style.width / 2,
                y: style.top,
            }
            break
        case 'b': // 下中
            point = {
                x: style.left + style.width / 2,
                y: style.top + style.height,
            }
            break
        case 'l': // 左中
            point = {
                x: style.left,
                y: style.top + style.height / 2,
            }
            break
        case 'r': // 右中
            point = {
                x: style.left + style.width,
                y: style.top + style.height / 2,
            }
            break
        case 'lt': // 左上
            point = {
                x: style.left,
                y: style.top,
            }
            break
        case 'rt': // 右上
            point = {
                x: style.left + style.width,
                y: style.top,
            }
            break
        case 'lb': // 左下
            point = {
                x: style.left,
                y: style.top + style.height,
            }
            break
        case 'rb': // 右下
        default:
            point = {
                x: style.left + style.width,
                y: style.top + style.height,
            }
            break
    }

    return calculateRotatedPointCoordinate(point, center, style.rotate)
}

/**
 * 求两点之间的中点坐标
 * @param p1 第一个点
 * @param p2 第二个点
 * @returns 中点坐标
 */
export function getCenterPoint(p1: Point, p2: Point): Point {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2,
    }
}

/**
 * 计算角度的正弦值（绝对值）
 * @param rotate 角度
 * @returns 正弦值
 */
export function sin(rotate: number): number {
    return Math.abs(Math.sin(angleToRadian(rotate)))
}

/**
 * 计算角度的余弦值（绝对值）
 * @param rotate 角度
 * @returns 余弦值
 */
export function cos(rotate: number): number {
    return Math.abs(Math.cos(angleToRadian(rotate)))
}

/**
 * 将角度标准化到 0-360 范围
 * @param deg 角度值
 * @returns 标准化后的角度
 */
export function mod360(deg: number): number {
    return (deg + 360) % 360
}

/**
 * 根据画布缩放比例调整样式值
 * @param value 原始值
 * @returns 缩放后的值
 */
export function changeStyleWithScale(value: number): number {
    const store = useStore()
    return value * (store.canvasStyleData.scale / 100)
}

/**
 * 将小数转换为百分比字符串
 * @param val 小数值
 * @returns 百分比字符串
 */
export function toPercent(val: number): string {
    return val * 100 + '%'
}
