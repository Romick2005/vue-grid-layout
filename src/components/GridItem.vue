<template>
  <div ref="item"
     class="vue-grid-item"
     :class="gridItemClass"
     :style="style">
    <slot/>
    <span
      v-if="resizable"
      ref="handle"
      :class="resizableHandleClass"></span>
    <!--<span v-if="draggable" ref="dragHandle" class="vue-draggable-handle"></span>-->
  </div>
</template>

<script>
  import {
    setTopLeft,
    setTopRight,
    setTransformRtl,
    setTransform
  } from '../helpers/utils';
  import {
    getControlPosition,
    createCoreData
  } from '../helpers/draggableUtils';
  import {
    getDocumentDir
  } from "../helpers/DOM";
  //  var eventBus = require('./eventBus');

  let interact = require("interactjs");

  export default {
    //name: "GridItem",
    props: {
      isDraggable: {
        type: Boolean,
        required: false,
        default: null
      },

      isResizable: {
        type: Boolean,
        required: false,
        default: null
      },

      minH: {
        type: Number,
        required: false,
        default: 1
      },

      minW: {
        type: Number,
        required: false,
        default: 1
      },

      maxH: {
        type: Number,
        required: false,
        default: Infinity
      },

      maxW: {
        type: Number,
        required: false,
        default: Infinity
      },

      x: {
        type: Number,
        required: true
      },

      y: {
        type: Number,
        required: true
      },

      w: {
        type: Number,
        required: true
      },

      h: {
        type: Number,
        required: true
      },

      i: {
        required: true
      },

      dragIgnoreFrom: {
        type: String,
        required: false,
        default: 'a, button'
      },

      dragAllowFrom: {
        type: String,
        required: false,
        default: null
      },

      resizeIgnoreFrom: {
        type: String,
        required: false,
        default: 'a, button'
      }
    },

    inject: ["eventBus"],

    data() {
      const me = this;
      return {
        cols: 1,
        containerWidth: 100,
        rowHeight: 30,
        margin: [10, 10],
        maxRows: Infinity,
        draggable: null,
        resizable: null,
        useCssTransforms: true,

        isDragging: false,
        isResizing: false,

        dragging: null,
        resizing: null,

        style: {},
        rtl: false,

        dragEventSet: false,
        resizeEventSet: false,

        previousW: null,
        previousH: null,
        previousX: null,
        previousY: null,

        innerX: me.x,
        innerY: me.y,
        innerW: me.w,
        innerH: me.h,

        lastX: NaN,
        lastY: NaN,
        lastW: NaN,
        lastH: NaN,
      }
    },

    created() {
      let me = this;

      me.setDraggableHandler = function (isDraggable) {
        if (me.isDraggable === null) {
          me.draggable = isDraggable;
        }
      };

      me.setResizableHandler = function (isResizable) {
        if (me.isResizable === null) {
          me.resizable = isResizable;
        }
      };

      me.setRowHeightHandler = function (rowHeight) {
        me.rowHeight = rowHeight;
      };

      me.directionchangeHandler = () => {
        me.rtl = getDocumentDir();
        me.compact();
      };

      me.setColNum = (colNum) => {
         me.cols = parseInt(colNum);
      }

      const eventBus = me.eventBus;
      eventBus.$on('updateWidth', me.updateWidth);
      eventBus.$on('compact', me.compact);
      eventBus.$on('setDraggable', me.setDraggableHandler);
      eventBus.$on('setResizable', me.setResizableHandler);
      eventBus.$on('setRowHeight', me.setRowHeightHandler);
      eventBus.$on('directionchange', me.directionchangeHandler);
      eventBus.$on('setColNum', me.setColNum)

      me.rtl = getDocumentDir();
    },

    beforeDestroy(){
      const me = this;
      const eventBus = me.eventBus;
      eventBus.$off('updateWidth', me.updateWidth);
      eventBus.$off('compact', me.compact);
      eventBus.$off('setDraggable', me.setDraggableHandler);
      eventBus.$off('setResizable', me.setResizableHandler);
      eventBus.$off('setRowHeight', me.setRowHeightHandler);
      eventBus.$off('directionchange', me.directionchangeHandler);
      eventBus.$off('setColNum', me.setColNum);
      me.interactObj.unset() // destroy interact intance
    },

    mounted() {
      const me = this;
      const parent = me.$parent;
      me.cols = parent.colNum;
      me.rowHeight = parent.rowHeight;
      me.containerWidth = parent.$el.clientWidth;
      me.margin = parent.margin !== undefined ? parent.margin : me.margin;//[10, 10];
      me.maxRows = parent.maxRows;
      me.draggable = me.isDraggable === null ? parent.isDraggable : me.isDraggable;
      me.resizable = me.isResizable === null ? parent.isResizable : me.isResizable;
      me.useCssTransforms = parent.useCssTransforms;
      me.createStyle();
    },

    watch: {
      isDraggable() {
        const me = this;
        me.draggable = me.isDraggable;
      },

      draggable() {
        const me = this;
        if (me.interactObj === null || me.interactObj === undefined) {
          me.interactObj = interact(me.$el);
        }
        if (me.draggable) {
          const opts = {
            ignoreFrom: me.dragIgnoreFrom,
            allowFrom: me.dragAllowFrom
          };
          me.interactObj.draggable(opts);
          /*me.interactObj.draggable({allowFrom: '.vue-draggable-handle'});*/
          if (!me.dragEventSet) {
            me.dragEventSet = true;
            me.interactObj.on('dragstart dragmove dragend', function (event) {
              me.handleDrag(event);
            });
          }
        } else {
          me.interactObj.draggable({
            enabled: false
          });
        }
      },

      isResizable() {
        const me = this;
        me.resizable = me.isResizable;
      },

      resizable() {
        const me = this;
        me.tryMakeResizable();
      },

      rowHeight() {
        const me = this;
        me.createStyle();
      },

      cols() {
        const me = this;
        me.tryMakeResizable();
        me.createStyle();
      },

      containerWidth() {
        const me = this;
        me.tryMakeResizable();
        me.createStyle();
      },

      x(newVal) {
        const me = this;
        me.innerX = newVal;
        me.createStyle();
      },

      y(newVal) {
        const me = this;
        me.innerY = newVal;
        me.createStyle();
      },

      h(newVal) {
        const me = this;
        me.innerH = newVal
        me.createStyle();
      },

      w(newVal) {
        const me = this;
        me.innerW = newVal;
        me.createStyle();
      },

      renderRtl() {
        const me = this;
        me.tryMakeResizable();
        me.createStyle();
      }
    },

    computed: {
      gridItemClass() {
        const me = this;
        return {
          "vue-resizable": me.resizable,
          "resizing": me.isResizing,
          "vue-draggable-dragging": me.isDragging,
          "cssTransforms": me.useCssTransforms,
          "render-rtl": me.renderRtl,
          "disable-userselect": me.isDragging
        };
      },

      renderRtl() {
        const me = this;
        return me.$parent.isMirrored ? !me.rtl : me.rtl;
      },

      resizableHandleClass() {
        const me = this;
        if (me.renderRtl) {
          return 'vue-resizable-handle vue-rtl-resizable-handle';
        } else {
          return 'vue-resizable-handle';
        }
      }
    },

    methods: {
      createStyle() {
        const me = this;
        if (me.x + me.w > me.cols) {
          me.innerX = 0;
          me.innerW = me.w > me.cols ? me.cols : me.w;
        } else {
          me.innerX = me.x;
          me.innerW = me.w;
        }
        let pos = me.calcPosition(me.innerX, me.innerY, me.innerW, me.innerH);

        if (me.isDragging) {
          pos.top = me.dragging.top;
          if (me.renderRtl) {
            pos.right = me.dragging.left;
          } else {
            pos.left = me.dragging.left;
          }
        }
        if (me.isResizing) {
          const resizing = me.resizing;
          pos.width = resizing.width;
          pos.height = resizing.height;
        }

        let style;
        // CSS Transforms support (default)
        if (me.useCssTransforms) {
          // Add rtl support
          if (me.renderRtl) {
            style = setTransformRtl(pos.top, pos.right, pos.width, pos.height);
          } else {
            style = setTransform(pos.top, pos.left, pos.width, pos.height);
          }

        } else { // top,left (slow)
          // Add rtl support
          if (me.renderRtl) {
            style = setTopRight(pos.top, pos.right, pos.width, pos.height);
          } else {
            style = setTopLeft(pos.top, pos.left, pos.width, pos.height);
          }
        }
        //console.log("createStyle-> " + me._uid + " height: " + style.height + "; width" + style.width);
        me.style = style;
      },

      handleResize(event) {
        const me = this;
        const position = getControlPosition(event);
        // Get the current drag point from the event. This is used as the offset.
        if (position == null) return; // not possible but satisfies flow
        const {x, y} = position;

        const newSize = {width: 0, height: 0};
        let pos;
        switch (event.type) {
          case "resizestart": {
            me.previousW = me.innerW;
            me.previousH = me.innerH;
            pos = me.calcPosition(me.innerX, me.innerY, me.innerW, me.innerH);
            newSize.width = pos.width;
            newSize.height = pos.height;
            me.resizing = newSize;
            me.isResizing = true;
            me.fireEvent("resizingStart", newSize);
            break;
          }
          case "resizemove": {
            //console.log("### resize => " + event.type + ", lastW=" + me.lastW + ", lastH=" + me.lastH);
            const coreEvent = createCoreData(me.lastW, me.lastH, x, y);
            const resizing = me.resizing;
            if (me.renderRtl) {
              newSize.width = resizing.width - coreEvent.deltaX;
            } else {
              newSize.width = resizing.width + coreEvent.deltaX;
            }
            newSize.height = resizing.height + coreEvent.deltaY;

            //console.log("### resize => " + event.type + ", deltaX=" + coreEvent.deltaX + ", deltaY=" + coreEvent.deltaY);
            me.resizing = newSize;
            me.fireEvent("resizing", newSize);
            break;
          }
          case "resizeend": {
            //console.log("### resize end => x=" +me.innerX + " y=" + me.innerY + " w=" + me.innerW + " h=" + me.innerH);
            pos = me.calcPosition(me.innerX, me.innerY, me.innerW, me.innerH);
            newSize.width = pos.width;
            newSize.height = pos.height;
            //console.log("### resize end => " + JSON.stringify(newSize));
            me.resizing = null;
            me.isResizing = false;
            //me.fireEvent("resizingEnd", newSize);
            break;
          }
        }

        // Get new WH
        pos = me.calcWH(newSize.height, newSize.width);
        if (pos.w < me.minW) {
          pos.w = me.minW;
        }
        if (pos.w > me.maxW) {
          pos.w = me.maxW;
        }
        if (pos.h < me.minH) {
          pos.h = me.minH;
        }
        if (pos.h > me.maxH) {
          pos.h = me.maxH;
        }

        if (pos.h < 1) {
          pos.h = 1;
        }
        if (pos.w < 1) {
          pos.w = 1;
        }

        me.lastW = x;
        me.lastH = y;

        const gridItemLayout = {
          h: pos.h,
          w: pos.w,
          height: newSize.height,
          width: newSize.width
        };

        /*if (me.innerW !== gridItemLayout.w || me.innerH !== gridItemLayout.h) {
          const placeholderSize = me.calcPosition(me.innerX, me.innerY, me.innerW, me.innerH);
          console.log("placeholderSize" + placeholderSize.height + " _ " + placeholderSize.width);
          gridItemLayout.height = placeholderSize.height;
          gridItemLayout.width = placeholderSize.width;
          me.fireEvent("resize", gridItemLayout);
        }*/
        if (event.type === "resizeend" && (me.previousW !== me.innerW || me.previousH !== me.innerH)) {
          me.fireEvent("resizingEnd", gridItemLayout);
        }
        me.eventBus.$emit("resizeEvent", event.type, me.i, me.innerX, me.innerY, pos.h, pos.w);//todo i replace by id or remove
      },

      handleDrag(event) {
        const me = this;
        if (me.isResizing) {
          return false;
        }

        const position = getControlPosition(event);

        // Get the current drag point from the event. This is used as the offset.
        const {x, y} = position;

        // let shouldUpdate = false;
        let newPosition = {top: 0, left: 0};
        switch (event.type) {
          case "dragstart": {
            me.previousX = me.innerX;
            me.previousY = me.innerY;

            let parentRect = event.target.offsetParent.getBoundingClientRect();
            let clientRect = event.target.getBoundingClientRect();
            if (me.renderRtl) {
              newPosition.left = (clientRect.right - parentRect.right) * -1;
            } else {
              newPosition.left = clientRect.left - parentRect.left;
            }
            newPosition.top = clientRect.top - parentRect.top;
            me.dragging = newPosition;
            me.isDragging = true;
            me.fireEvent("movingStart", newPosition);
            break;
          }
          case "dragmove": {
            const coreEvent = createCoreData(me.lastX, me.lastY, x, y);
            // Add rtl support
            if (me.renderRtl) {
              newPosition.left = me.dragging.left - coreEvent.deltaX;
            } else {
              newPosition.left = me.dragging.left + coreEvent.deltaX;
            }
            newPosition.top = me.dragging.top + coreEvent.deltaY;
            // console.log("### drag => " + event.type + ", x=" + x + ", y=" + y);
            // console.log("### drag => " + event.type + ", deltaX=" + coreEvent.deltaX + ", deltaY=" + coreEvent.deltaY);
            // console.log("### drag end => " + JSON.stringify(newPosition));
            me.dragging = newPosition;
            me.fireEvent("moving", newPosition);
            break;
          }
          case "dragend": {
            if (!me.isDragging) {
              return false;
            }
            let parentRect = event.target.offsetParent.getBoundingClientRect();
            let clientRect = event.target.getBoundingClientRect();
            // Add rtl support
            if (me.renderRtl) {
              newPosition.left = (clientRect.right - parentRect.right) * -1;
            } else {
              newPosition.left = clientRect.left - parentRect.left;
            }
            newPosition.top = clientRect.top - parentRect.top;
            // console.log("### drag end => " + JSON.stringify(newPosition));
            // console.log("### DROP: " + JSON.stringify(newPosition));
            me.dragging = null;
            me.isDragging = false;
            // shouldUpdate = true;
            me.fireEvent("movingEnd", newPosition);
            break;
          }
        }

        // Get new XY
        let pos;
        if (me.renderRtl) {
          pos = me.calcXY(newPosition.top, newPosition.left);
        } else {
          pos = me.calcXY(newPosition.top, newPosition.left);
        }

        me.lastX = x;
        me.lastY = y;

        /*if (me.innerX !== pos.x || me.innerY !== pos.y) {
          me.$emit("move", me.id, pos.x, pos.y);
        }
        if (event.type === "dragend" && (me.previousX !== me.innerX || me.previousY !== me.innerY)) {
          me.$emit("moved", me.id, pos.x, pos.y);
        }*/
        me.eventBus.$emit("dragEvent", event.type, me.i, pos.x, pos.y, me.innerH, me.innerW);//todo i replace by id or remove
      },

      calcPosition(x, y, w, h) {
        const me = this;
        const colWidth = me.calcColWidth();
        const out = {
          top: Math.round(me.rowHeight * y + (y + 1) * me.margin[1]),
          // 0 * Infinity = NaN, which causes problems with resize constriants;
          // Fix this if it occurs.
          // Note we do it here rather than later because Math.round(Infinity) causes deopt
          width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * me.margin[0]),
          height: h === Infinity ? h : Math.round(me.rowHeight * h + Math.max(0, h - 1) * me.margin[1]),
          colWidth: colWidth//temp test not used yet
        };

        if (me.renderRtl) {
          out.right = Math.round(colWidth * x + (x + 1) * me.margin[0]);
        } else {
          out.left = Math.round(colWidth * x + (x + 1) * me.margin[0]);
        }
        return out;
      },

      /**
       * Translate x and y coordinates from pixels to grid units.
       * @param  {Number} top  Top position (relative to parent) in pixels.
       * @param  {Number} left Left position (relative to parent) in pixels.
       * @return {Object} x and y in grid units.
       */
      // TODO check if this function needs change in order to support rtl.
      calcXY(top, left) {
        const me = this;
        const colWidth = me.calcColWidth();

        // left = colWidth * x + margin * (x + 1)
        // l = cx + m(x+1)
        // l = cx + mx + m
        // l - m = cx + mx
        // l - m = x(c + m)
        // (l - m) / (c + m) = x
        // x = (left - margin) / (coldWidth + margin)
        let x = Math.round((left - me.margin[0]) / (colWidth + me.margin[0]));
        let y = Math.round((top - me.margin[1]) / (me.rowHeight + me.margin[1]));

        // Capping
        x = Math.max(Math.min(x, me.cols - me.innerW), 0);
        y = Math.max(Math.min(y, me.maxRows - me.innerH), 0);

        return {x, y};
      },

      // Helper for generating column width
      calcColWidth() {
        const me = this;
        const colWidth = (me.containerWidth - (me.margin[0] * (me.cols + 1))) / me.cols;
         // console.log("### COLS=" + me.cols + " COL WIDTH=" + colWidth + " MARGIN " + me.margin[0]);
        return colWidth;
      },

      /**
       * Given a height and width in pixel values, calculate grid units.
       * @param  {Number} height Height in pixels.
       * @param  {Number} width  Width in pixels.
       * @return {Object} w, h as grid units.
       */
      calcWH(height, width) {
        const me = this;
        const colWidth = me.calcColWidth();

        // width = colWidth * w - (margin * (w - 1))
        // ...
        // w = (width + margin) / (colWidth + margin)
        let w = Math.round((width + me.margin[0]) / (colWidth + me.margin[0]));
        let h = Math.round((height + me.margin[1]) / (me.rowHeight + me.margin[1]));

        // Capping
        w = Math.max(Math.min(w, me.cols - me.innerX), 0);
        h = Math.max(Math.min(h, me.maxRows - me.innerY), 0);
        return {w, h};
      },

      updateWidth(width, colNum) {
        const me = this;
        me.containerWidth = width;
        if (colNum !== undefined && colNum !== null) {
          me.cols = colNum;
        }
      },

      compact() {
        const me = this;
        me.createStyle();
      },

      tryMakeResizable() {
        const me = this;
        if (me.interactObj === null || me.interactObj === undefined) {
          me.interactObj = interact(me.$el);
        }
        if (me.resizable) {
          let maximum = me.calcPosition(0, 0, me.maxW, me.maxH);
          let minimum = me.calcPosition(0, 0, me.minW, me.minH);

          // console.log("### MAX " + JSON.stringify(maximum));
          // console.log("### MIN " + JSON.stringify(minimum));

          const opts = {
            preserveAspectRatio: true,
            // allowFrom: "." + me.resizableHandleClass,
            edges: {
              left: false,
              right: "." + me.resizableHandleClass,
              bottom: "." + me.resizableHandleClass,
              top: false
            },
            ignoreFrom: me.resizeIgnoreFrom,
            restrictSize: {
              min: {
                height: minimum.height,
                width: minimum.width
              },
              max: {
                height: maximum.height,
                width: maximum.width
              }
            }
          };

          me.interactObj.resizable(opts);
          if (!me.resizeEventSet) {
            me.resizeEventSet = true;
            me.interactObj.on('resizestart resizemove resizeend',
              function (event) {
                me.handleResize(event);
              }
            );
          }
        } else {
          me.interactObj.resizable({
            enabled: false
          });
        }
      },

      autoSize() {
        const me = this;

        // ok here we want to calculate if a resize is needed
        me.previousW = me.innerW;
        me.previousH = me.innerH;

        let newSize = me.$slots.default[0].elm.getBoundingClientRect();
        let pos = me.calcWH(newSize.height, newSize.width);
        if (pos.w < me.minW) {
          pos.w = me.minW;
        }
        if (pos.w > me.maxW) {
          pos.w = me.maxW;
        }
        if (pos.h < me.minH) {
          pos.h = me.minH;
        }
        if (pos.h > me.maxH) {
          pos.h = me.maxH;
        }

        if (pos.h < 1) {
          pos.h = 1;
        }
        if (pos.w < 1) {
          pos.w = 1;
        }

        // me.lastW = x; // basicly, me is copied from resizehandler, but shouldn't be needed
        // me.lastH = y;

        const gridItemLayout = {
          h: pos.h,
          w: pos.w,
          height: newSize.height,
          width: newSize.width
        };
        if (me.innerW !== gridItemLayout.w || me.innerH !== gridItemLayout.h) {
          me.fireEvent("resizing", gridItemLayout);
        }
        if (me.previousW !== gridItemLayout.w || me.previousH !== gridItemLayout.h) {
          me.fireEvent("resizingEnd", gridItemLayout);
          me.eventBus.$emit("resizeEvent", "resizeend", me.i, me.innerX, me.innerY, pos.h, pos.w);//todo i replace by id or remove
        }
      },


      fireEvent(eventName, gridItemLayout) {
        const me = this;
        //eventName in [
        //  "resizingStart", "resizing", "resizingEnd",
        //  "movingStart", "moving", "movingEnd"
        //]
        me.$emit(eventName, {
          x: gridItemLayout.left,//"movingStart", "moving", "movingEnd"
          y: gridItemLayout.top,//"movingStart", "moving", "movingEnd"
          h: gridItemLayout.h,//"resizingStart", "resizing", "resizingEnd",
          w: gridItemLayout.w,//"resizingStart", "resizing", "resizingEnd",
          width: gridItemLayout.width,//"resizingStart", "resizing", "resizingEnd",
          height: gridItemLayout.height//"resizingStart", "resizing", "resizingEnd",
        });
      }
    }
  }
</script>

<style>
  .vue-grid-item {
    transition: all 200ms ease;
    transition-property: left, top, right;
    /* add right for rtl */
  }

  .vue-grid-item.cssTransforms {
    transition-property: transform;
    left: 0;
    right: auto;
  }

  .vue-grid-item.cssTransforms.render-rtl {
    left: auto;
    right: 0;
  }

  .vue-grid-item.resizing {
    opacity: 0.6;
    z-index: 3;
  }

  .vue-grid-item.vue-draggable-dragging {
    transition:none;
    z-index: 3;
  }

  .vue-grid-item.vue-grid-placeholder {
    background: red;
    opacity: 0.2;
    transition-duration: 100ms;
    z-index: 2;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
  }

  .vue-grid-item > .vue-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
    background-position: bottom right;
    padding: 0 3px 3px 0;
    background-repeat: no-repeat;
    background-origin: content-box;
    box-sizing: border-box;
    cursor: se-resize;
  }

  .vue-grid-item > .vue-rtl-resizable-handle {
    bottom: 0;
    left: 0;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAuMDAwMDAwMDAwMDAwMDAyIiBoZWlnaHQ9IjEwLjAwMDAwMDAwMDAwMDAwMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5jb20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgogPGc+CiAgPHRpdGxlPmJhY2tncm91bmQ8L3RpdGxlPgogIDxyZWN0IGZpbGw9Im5vbmUiIGlkPSJjYW52YXNfYmFja2dyb3VuZCIgaGVpZ2h0PSIxMiIgd2lkdGg9IjEyIiB5PSItMSIgeD0iLTEiLz4KICA8ZyBkaXNwbGF5PSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgeT0iMCIgeD0iMCIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgaWQ9ImNhbnZhc0dyaWQiPgogICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIi8+CiAgPC9nPgogPC9nPgogPGc+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPgogIDxsaW5lIGNhbnZhcz0iI2ZmZmZmZiIgY2FudmFzLW9wYWNpdHk9IjEiIHN0cm9rZS1saW5lY2FwPSJ1bmRlZmluZWQiIHN0cm9rZS1saW5lam9pbj0idW5kZWZpbmVkIiBpZD0ic3ZnXzEiIHkyPSItNzAuMTc4NDA3IiB4Mj0iMTI0LjQ2NDE3NSIgeTE9Ii0zOC4zOTI3MzciIHgxPSIxNDQuODIxMjg5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlPSIjMDAwIiBmaWxsPSJub25lIi8+CiAgPGxpbmUgc3Ryb2tlPSIjNjY2NjY2IiBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z181IiB5Mj0iOS4xMDY5NTciIHgyPSIwLjk0NzI0NyIgeTE9Ii0wLjAxODEyOCIgeDE9IjAuOTQ3MjQ3IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z183IiB5Mj0iOSIgeDI9IjEwLjA3MzUyOSIgeTE9IjkiIHgxPSItMC42NTU2NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiM2NjY2NjYiIGZpbGw9Im5vbmUiLz4KIDwvZz4KPC9zdmc+);
    background-position: bottom left;
    padding-left: 3px;
    background-repeat: no-repeat;
    background-origin: content-box;
    cursor: sw-resize;
    right: auto;
  }

  .vue-grid-item.disable-userselect {
    user-select: none;
  }
</style>
