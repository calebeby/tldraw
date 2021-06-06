import { v4 as uuid } from 'uuid'
import * as vec from 'utils/vec'
import { DashStyle, DrawShape, ShapeStyles, ShapeType } from 'types'
import { registerShapeUtils } from './index'
import { intersectPolylineBounds } from 'utils/intersections'
import { boundsContain, boundsContainPolygon } from 'utils/bounds'
import getStroke from 'perfect-freehand'
import {
  getBoundsCenter,
  getBoundsFromPoints,
  getRotatedCorners,
  getSvgPathFromStroke,
  rotateBounds,
  translateBounds,
} from 'utils/utils'
import { defaultStyle, getShapeStyle } from 'lib/shape-styles'

const rotatedCache = new WeakMap<DrawShape, number[][]>([])
const pathCache = new WeakMap<DrawShape['points'], string>([])

const draw = registerShapeUtils<DrawShape>({
  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uuid(),
      type: ShapeType.Draw,
      isGenerated: false,
      name: 'Draw',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      points: [],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    }
  },

  render(shape) {
    const { id, points, style } = shape

    const styles = getShapeStyle(style)

    if (!pathCache.has(points)) {
      renderPath(shape, style)
    }

    if (points.length < 2) {
      return (
        <circle id={id} r={+styles.strokeWidth * 0.618} fill={styles.stroke} />
      )
    }

    return <path id={id} d={pathCache.get(points)} fill={styles.stroke} />
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      const bounds = getBoundsFromPoints(shape.points)
      this.boundsCache.set(shape, bounds)
    }

    return translateBounds(this.boundsCache.get(shape), shape.point)
  },

  getRotatedBounds(shape) {
    const rBounds = translateBounds(
      getBoundsFromPoints(shape.points, shape.rotation),
      shape.point
    )

    const bounds = this.getBounds(shape)

    const delta = vec.sub(getBoundsCenter(bounds), getBoundsCenter(rBounds))

    return translateBounds(rBounds, delta)
  },

  getCenter(shape) {
    const bounds = this.getRotatedBounds(shape)
    return [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
  },

  hitTest(shape, point) {
    let pt = vec.sub(point, shape.point)
    const min = +getShapeStyle(shape.style).strokeWidth
    return shape.points.some(
      (curr, i) =>
        i > 0 && vec.distanceToLineSegment(shape.points[i - 1], curr, pt) < min
    )
  },

  hitTestBounds(this, shape, brushBounds) {
    // Test axis-aligned shape
    if (shape.rotation === 0) {
      return (
        boundsContain(brushBounds, this.getBounds(shape)) ||
        intersectPolylineBounds(shape.points, brushBounds).length > 0
      )
    }

    // Test rotated shape
    const rBounds = this.getRotatedBounds(shape)

    if (!rotatedCache.has(shape)) {
      const c = getBoundsCenter(rBounds)
      rotatedCache.set(
        shape,
        shape.points.map((pt) =>
          vec.rotWith(vec.add(pt, shape.point), c, shape.rotation)
        )
      )
    }

    return (
      boundsContain(brushBounds, rBounds) ||
      intersectPolylineBounds(rotatedCache.get(shape), brushBounds).length > 0
    )
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
    const initialShapeBounds = this.boundsCache.get(initialShape)
    shape.points = initialShape.points.map(([x, y]) => {
      return [
        bounds.width *
          (scaleX < 0
            ? 1 - x / initialShapeBounds.width
            : x / initialShapeBounds.width),
        bounds.height *
          (scaleY < 0
            ? 1 - y / initialShapeBounds.height
            : y / initialShapeBounds.height),
      ]
    })

    const newBounds = getBoundsFromPoints(shape.points)

    shape.point = vec.sub(
      [bounds.minX, bounds.minY],
      [newBounds.minX, newBounds.minY]
    )
    return this
  },

  applyStyles(shape, style) {
    const styles = { ...shape.style, ...style }
    styles.isFilled = false
    styles.dash = DashStyle.Solid
    shape.style = styles
    shape.points = [...shape.points]
    return this
  },

  canStyleFill: false,
})

export default draw

const simulatePressureSettings = {
  simulatePressure: true,
}

const realPressureSettings = {
  easing: (t: number) => t * t,
  simulatePressure: false,
  // start: { taper: 1 },
  // end: { taper: 1 },
}

function renderPath(shape: DrawShape, style: ShapeStyles) {
  const styles = getShapeStyle(style)

  if (shape.points.length < 2) {
    pathCache.set(shape.points, '')
    return
  }

  const options =
    shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings

  const stroke = getStroke(shape.points, {
    size: 1 + +styles.strokeWidth * 2,
    thinning: 0.85,
    end: { taper: +styles.strokeWidth * 20 },
    start: { taper: +styles.strokeWidth * 20 },
    ...options,
  })

  pathCache.set(shape.points, getSvgPathFromStroke(stroke))
}
