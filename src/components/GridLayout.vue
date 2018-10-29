<template>
  <div
    :style="mergedStyle"
    class="vue-grid-layout">
    <slot></slot>

    <grid-item
      v-show="isDragging"
      :x="placeholder.x"
      :y="placeholder.y"
      :w="placeholder.w"
      :h="placeholder.h"
      :i="placeholder[layoutUniquePropertyName]"
      class="vue-grid-placeholder"/>
  </div>
</template>

<script>
import Vue from "vue";

const elementResizeDetectorMaker = require("element-resize-detector");

import {
  bottom,
  compact,
  getArrayItem,
  moveElement,
  validateLayout
} from "../helpers/utils";
import {
  addWindowEventListener,
  removeWindowEventListener
} from "../helpers/DOM";
import GridItem from "./GridItem.vue"

export default {

  provide() {
    return {
      eventBus: null
    }
  },

  components: {
    "grid-item": GridItem
  },

  props: {
    // If true, the container height swells and contracts to fit contents
    autoSize: {
      type: Boolean,
      default: true
    },

    colNum: {
      type: Number,
      default: 12
    },

    rowHeight: {
      type: Number,
      default: 150
    },

    maxRows: {
      type: Number,
      default: Infinity
    },

    margin: {
      type: Array,
      default: function () {
        return [10, 10];
      }
    },

    isDraggable: {
      type: Boolean,
      default: true
    },

    isResizable: {
      type: Boolean,
      default: true
    },

    isMirrored: {
      type: Boolean,
      default: false
    },

    useCssTransforms: {
      type: Boolean,
      default: false
    },

    verticalCompact: {
      type: Boolean,
      default: true
    },

    layout: {
      type: Array,
      required: true,
    },

    layoutUniquePropertyName: {
      type: String,
      default: "id"
    }
  },

  data() {
    return {
      width: null,
      mergedStyle: {},
      lastLayoutLength: 0,
      isDragging: false,
      placeholder: {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        i: -1
      },
    };
  },

  created() {
    const me = this;
    const eventBus = new Vue();
    me._provided.eventBus = eventBus;
    me.eventBus = eventBus;
    eventBus.$on("resizeEvent", me.resizeEvent);
    eventBus.$on("dragEvent", me.dragEvent);
  },

  beforeDestroy() {
    const me = this;
    const eventBus = me.eventBus;
    eventBus.$off("resizeEvent", me.resizeEvent);
    eventBus.$off("dragEvent", me.dragEvent);
    removeWindowEventListener("resize", me.onWindowResize);
  },

  mounted() {
    const me = this;
    //me.$nextTick(function () {
    validateLayout(me.layout);
    //me.$nextTick(function() {
    if (me.width === null) {
      me.onWindowResize();
      //me.width = me.$el.offsetWidth;
      addWindowEventListener("resize", me.onWindowResize);
    }
    compact(me.layout, me.verticalCompact);

    me.updateHeight();
    //me.$nextTick(function () {
      const erd = elementResizeDetectorMaker({
        strategy: "scroll" //<- For ultra performance.
      });
      erd.listenTo(me.$el, function () {
        me.onWindowResize();
      });
    //});
    //  });

    addWindowEventListener("load", me.onWindowLoad.bind(me));//??
    //});
  },

  watch: {
    width() {
      const me = this;
      me.$nextTick(function () {
        //me.$broadcast("updateWidth", me.width);
        me.eventBus.$emit("updateWidth", me.width);
        me.updateHeight();
      });
    },

    layout () {
      const me = this;
      me.layoutUpdate();
    },

    colNum(val) {
      const me = this;
      me.eventBus.$emit("setColNum", val);
    },

    rowHeight() {
      const me = this;
      me.eventBus.$emit("setRowHeight", me.rowHeight);
    },

    isDraggable() {
      const me = this;
      me.eventBus.$emit("setDraggable", me.isDraggable);
    },

    isResizable() {
      const me = this;
      me.eventBus.$emit("setResizable", me.isResizable);
    }
  },

  methods: {
    onWindowLoad() {
      //console.log("onWindowLoad");
      const me = this;

      if (me.width === null) {
        me.onWindowResize();
        //me.width = me.$el.offsetWidth;
        addWindowEventListener("resize", me.onWindowResize);
      }
      compact(me.layout, me.verticalCompact);

      me.updateHeight();
      me.$nextTick(function () {
        const erd = elementResizeDetectorMaker({
          strategy: "scroll" //<- For ultra performance.
        });
        erd.listenTo(me.$el, function () {
          me.onWindowResize();
        });
      });
    },

    layoutUpdate() {
      const me = this;
      const layout = me.layout;
      if (layout !== undefined) {
        if (layout.length !== me.lastLayoutLength) {
          //console.log("### LAYOUT UPDATE!");
          me.lastLayoutLength = layout.length;
        }
        compact(layout, me.verticalCompact);
        me.eventBus.$emit("updateWidth", me.width);
        me.updateHeight();
      }
    },

    updateHeight() {
      const me = this;
      //console.log("mergedStyle updateHeight");
      me.mergedStyle = {
        height: me.containerHeight()
      };
    },

    onWindowResize() {
      const me = this;
      //if (me.$el) {
        me.width = me.$el.offsetWidth;
      //}
    },

    containerHeight() {
      const me = this;
      if (!me.autoSize) {
        return false;
      }
      const margin = me.margin[1];
      return bottom(me.layout) * (me.rowHeight + margin) + margin + "px";
    },

    dragEvent(eventName, id, x, y, h, w) {
      const me = this;
      if (eventName === "dragmove" || eventName === "dragstart") {
        me.placeholder.i = id;
        me.placeholder.x = x;
        me.placeholder.y = y;
        me.placeholder.w = w;
        me.placeholder.h = h;
        //me.$nextTick(function() {
          me.isDragging = true;
        //});
        me.eventBus.$emit("updateWidth", me.width);
      } else {
        //me.$nextTick(function() {
          me.isDragging = false;
        //});
      }
      //console.log(eventName + " id=" + id + ", x=" + x + ", y=" + y);
      let l = getArrayItem(me.layout, me.layoutUniquePropertyName, id);
      //getArrayItem sometimes returns null object //todo check
      if (l === null) {
        l = {
          x: 0,
          y: 0
        };
      }
      l.x = x;
      l.y = y;
      // Move the element to the dragged location.
      me.layout = moveElement(me.layout, l, x, y, true);
      compact(me.layout, me.verticalCompact);
      // needed because vue can"t detect changes on array element properties
      me.eventBus.$emit("compact");
      me.updateHeight();
      if (eventName === "dragend") {
        me.$emit("layout-updated", me.layout);
      }
    },

    resizeEvent(eventName, id, x, y, h, w) {
      const me = this;

      if (eventName === "resizestart" || eventName === "resizemove") {
        const placeholder = me.placeholder;
        placeholder.i = id;
        placeholder.x = x;
        placeholder.y = y;
        placeholder.w = w;
        placeholder.h = h;
        //me.$nextTick(function() {
          me.isDragging = true;
        //});
        me.eventBus.$emit("updateWidth", me.width);
      } else {
        //me.$nextTick(function() {
          me.isDragging = false;
        //});
      }
      let l = getArrayItem(me.layout, me.layoutUniquePropertyName, id);
      //getArrayItem sometimes return null object
      if (l === null) {
        l = {
          h: 0,
          w: 0
        };
      }
      l.h = h;
      l.w = w;
      compact(me.layout, me.verticalCompact);
      me.eventBus.$emit("compact");
      me.updateHeight();
      if (eventName === "resizeend") {
        me.$emit("layout-updated", me.layout);
      }
    }
  }
};
</script>

<style>
.vue-grid-layout {
  position: relative;
  transition: height 200ms ease;
}
</style>