import { calculateRotatedPointCoordinate, getCenterPoint } from './translate'
import type { ComponentStyle } from '@/types'

/**
 * 点坐标接口
 */
interface Point {
  x: number
  y: number
}

/**
 * 控制点信息
 */
interface PointInfo {
  symmetricPoint: Point
  curPoint: Point
}

/**
 * 控制点名称类型
 */
type PointName = 'lt' | 't' | 'rt' | 'r' | 'rb' | 'b' | 'lb' | 'l'

/**
 * 计算函数类型
 */
type CalculateFunction = (
  style: ComponentStyle,
  curPosition: Point,
  proportion: number,
  needLockProportion: boolean,
  pointInfo: PointInfo
) => void

// ==================== 角落控制点（lt, rt, rb, lb）====================

/**
 * 角落控制点配置
 */
interface CornerConfig {
  /** 从 curPosition 计算的点（旋转前） */
  curToPoint: (pos: Point) => Point
  /** 从 symmetricPoint 计算的点（旋转前） */
  symToPoint: (pos: Point) => Point
  /** 宽度计算：cur.x - sym.x 还是 sym.x - cur.x */
  widthSign: 1 | -1
  /** 高度计算：cur.y - sym.y 还是 sym.y - cur.y */
  heightSign: 1 | -1
  /** 比例约束时调整哪个点 */
  adjustPoint: 'cur' | 'sym'
  /** 最终 left 取自哪个点 */
  leftFrom: 'cur' | 'sym'
  /** 最终 top 取自哪个点 */
  topFrom: 'cur' | 'sym'
}

const CORNER_CONFIGS: Record<'lt' | 'rt' | 'rb' | 'lb', CornerConfig> = {
    lt: {
        curToPoint: p => p,
        symToPoint: p => p,
        widthSign: -1,
        heightSign: -1,
        adjustPoint: 'cur',
        leftFrom: 'cur',
        topFrom: 'cur',
    },
    rt: {
        curToPoint: p => p,
        symToPoint: p => p,
        widthSign: 1,
        heightSign: -1,
        adjustPoint: 'cur',
        leftFrom: 'sym',
        topFrom: 'cur',
    },
    rb: {
        curToPoint: p => p,
        symToPoint: p => p,
        widthSign: 1,
        heightSign: 1,
        adjustPoint: 'cur',
        leftFrom: 'sym',
        topFrom: 'sym',
    },
    lb: {
        curToPoint: p => p,
        symToPoint: p => p,
        widthSign: -1,
        heightSign: 1,
        adjustPoint: 'cur',
        leftFrom: 'cur',
        topFrom: 'sym',
    },
}

/**
 * 角落控制点的通用计算逻辑
 */
function calculateCorner(
    config: CornerConfig,
    style: ComponentStyle,
    curPosition: Point,
    proportion: number,
    needLockProportion: boolean,
    pointInfo: PointInfo,
): void {
    const { symmetricPoint } = pointInfo
    const rotate = style.rotate ?? 0
    const negRotate = -rotate

    let newCenterPoint = getCenterPoint(curPosition, symmetricPoint)
    let newCurPoint = calculateRotatedPointCoordinate(curPosition, newCenterPoint, negRotate)
    let newSymPoint = calculateRotatedPointCoordinate(symmetricPoint, newCenterPoint, negRotate)

    let newWidth = (newCurPoint.x - newSymPoint.x) * config.widthSign
    let newHeight = (newCurPoint.y - newSymPoint.y) * config.heightSign

    if (needLockProportion) {
        if (newWidth / newHeight > proportion) {
            const diff = Math.abs(newWidth - newHeight * proportion)
            if (config.adjustPoint === 'cur') {
                newCurPoint.x += diff * (config.widthSign === 1 ? -1 : 1)
            } else {
                newSymPoint.x += diff * (config.widthSign === 1 ? 1 : -1)
            }
            newWidth = newHeight * proportion
        } else {
            const diff = Math.abs(newHeight - newWidth / proportion)
            if (config.adjustPoint === 'cur') {
                newCurPoint.y += diff * (config.heightSign === 1 ? -1 : 1)
            } else {
                newSymPoint.y += diff * (config.heightSign === 1 ? 1 : -1)
            }
            newHeight = newWidth / proportion
        }

        const rotatedCurPoint = calculateRotatedPointCoordinate(
            config.adjustPoint === 'cur' ? newCurPoint : newSymPoint,
            newCenterPoint,
            rotate,
        )
        newCenterPoint = getCenterPoint(rotatedCurPoint, symmetricPoint)
        newCurPoint = calculateRotatedPointCoordinate(curPosition, newCenterPoint, negRotate)
        newSymPoint = calculateRotatedPointCoordinate(symmetricPoint, newCenterPoint, negRotate)

        newWidth = (newCurPoint.x - newSymPoint.x) * config.widthSign
        newHeight = (newCurPoint.y - newSymPoint.y) * config.heightSign
    }

    if (newWidth > 0 && newHeight > 0) {
        style.width = Math.round(newWidth)
        style.height = Math.round(newHeight)
        style.left = Math.round((config.leftFrom === 'cur' ? newCurPoint : newSymPoint).x)
        style.top = Math.round((config.topFrom === 'cur' ? newCurPoint : newSymPoint).y)
    }
}

// ==================== 边缘控制点（t, r, b, l）====================

/**
 * 边缘控制点配置
 */
interface EdgeConfig {
  /** 从旋转后的 curPosition 中取哪个分量作为投影点 */
  projectAxis: 'x' | 'y'
  /** 对称点的固定分量来源 */
  fixedFrom: 'curPoint' | 'symmetricPoint'
  /** 新尺寸的计算方式 */
  calcSize: (projected: Point, symmetric: Point) => number
  /** 是否锁定比例时计算宽度（true）还是高度（false） */
  proportionCalcWidth: boolean
  /** 最终样式中 width 的来源 */
  widthSource: 'calculated' | 'existing'
  /** 最终样式中 height 的来源 */
  heightSource: 'calculated' | 'existing'
}

const EDGE_CONFIGS: Record<'t' | 'r' | 'b' | 'l', EdgeConfig> = {
    t: {
        projectAxis: 'y',
        fixedFrom: 'symmetricPoint',
        calcSize: (p, s) => Math.sqrt((p.x - s.x) ** 2 + (p.y - s.y) ** 2),
        proportionCalcWidth: true,
        widthSource: 'calculated',
        heightSource: 'calculated',
    },
    r: {
        projectAxis: 'x',
        fixedFrom: 'curPoint',
        calcSize: (p, s) => Math.sqrt((p.x - s.x) ** 2 + (p.y - s.y) ** 2),
        proportionCalcWidth: false,
        widthSource: 'calculated',
        heightSource: 'calculated',
    },
    b: {
        projectAxis: 'y',
        fixedFrom: 'symmetricPoint',
        calcSize: (p, s) => Math.sqrt((p.x - s.x) ** 2 + (p.y - s.y) ** 2),
        proportionCalcWidth: true,
        widthSource: 'calculated',
        heightSource: 'calculated',
    },
    l: {
        projectAxis: 'x',
        fixedFrom: 'curPoint',
        calcSize: (p, s) => Math.sqrt((p.x - s.x) ** 2 + (p.y - s.y) ** 2),
        proportionCalcWidth: false,
        widthSource: 'calculated',
        heightSource: 'calculated',
    },
}

/**
 * 边缘控制点的通用计算逻辑
 */
function calculateEdge(
    config: EdgeConfig,
    style: ComponentStyle,
    curPosition: Point,
    proportion: number,
    needLockProportion: boolean,
    pointInfo: PointInfo,
): void {
    const { symmetricPoint, curPoint } = pointInfo
    const rotate = style.rotate ?? 0

    const rotatedCurPosition = calculateRotatedPointCoordinate(curPosition, curPoint, -rotate)

    // 投影：保留一个轴的 curPosition 分量，另一个轴用 curPoint 的固定值
    const projected: Point = config.projectAxis === 'x'
        ? { x: rotatedCurPosition.x, y: curPoint.y }
        : { x: curPoint.x, y: rotatedCurPosition.y }

    const rotatedMiddlePoint = calculateRotatedPointCoordinate(projected, curPoint, rotate)

    const fixedPoint = config.fixedFrom === 'curPoint' ? curPoint : symmetricPoint
    const newSize = config.calcSize(rotatedMiddlePoint, fixedPoint)

    const newCenter = {
        x: rotatedMiddlePoint.x - (rotatedMiddlePoint.x - fixedPoint.x) / 2,
        y: rotatedMiddlePoint.y + (fixedPoint.y - rotatedMiddlePoint.y) / 2,
    }

    let width = style.width
    let height = style.height

    if (config.proportionCalcWidth) {
    // t / b：新高度已知，宽度由比例决定
        height = newSize
        if (needLockProportion) {
            width = newSize * proportion
        }
        style.width = width
        style.height = Math.round(height)
        style.top = Math.round(newCenter.y - height / 2)
        style.left = Math.round(newCenter.x - width / 2)
    } else {
    // r / l：新宽度已知，高度由比例决定
        width = newSize
        if (needLockProportion) {
            height = newSize / proportion
        }
        style.height = height
        style.width = Math.round(width)
        style.top = Math.round(newCenter.y - height / 2)
        style.left = Math.round(newCenter.x - width / 2)
    }
}

// ==================== 统一分发 ====================

/**
 * 控制点计算函数映射
 */
const funcs: Record<PointName, CalculateFunction> = {
    lt: (style, curPos, proportion, needLock, pointInfo) =>
        calculateCorner(CORNER_CONFIGS.lt, style, curPos, proportion, needLock, pointInfo),
    t: (style, curPos, proportion, needLock, pointInfo) =>
        calculateEdge(EDGE_CONFIGS.t, style, curPos, proportion, needLock, pointInfo),
    rt: (style, curPos, proportion, needLock, pointInfo) =>
        calculateCorner(CORNER_CONFIGS.rt, style, curPos, proportion, needLock, pointInfo),
    r: (style, curPos, proportion, needLock, pointInfo) =>
        calculateEdge(EDGE_CONFIGS.r, style, curPos, proportion, needLock, pointInfo),
    rb: (style, curPos, proportion, needLock, pointInfo) =>
        calculateCorner(CORNER_CONFIGS.rb, style, curPos, proportion, needLock, pointInfo),
    b: (style, curPos, proportion, needLock, pointInfo) =>
        calculateEdge(EDGE_CONFIGS.b, style, curPos, proportion, needLock, pointInfo),
    lb: (style, curPos, proportion, needLock, pointInfo) =>
        calculateCorner(CORNER_CONFIGS.lb, style, curPos, proportion, needLock, pointInfo),
    l: (style, curPos, proportion, needLock, pointInfo) =>
        calculateEdge(EDGE_CONFIGS.l, style, curPos, proportion, needLock, pointInfo),
}

/**
 * 计算组件拖动后的位置和大小
 * @param name 控制点名称
 * @param style 组件样式
 * @param curPosition 当前位置
 * @param proportion 宽高比
 * @param needLockProportion 是否锁定宽高比
 * @param pointInfo 控制点信息
 */
export default function calculateComponentPositionAndSize(
    name: PointName,
    style: ComponentStyle,
    curPosition: Point,
    proportion: number,
    needLockProportion: boolean,
    pointInfo: PointInfo,
): void {
    funcs[name](style, curPosition, proportion, needLockProportion, pointInfo)
}
