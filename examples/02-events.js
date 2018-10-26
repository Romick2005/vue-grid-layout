var testLayout = [
  {"x":0,"y":0,"w":2,"h":2,"i":"0"},
  {"x":2,"y":0,"w":2,"h":4,"i":"1"},
  {"x":4,"y":0,"w":2,"h":5,"i":"2"},
  {"x":6,"y":0,"w":2,"h":3,"i":"3"},
  {"x":8,"y":0,"w":2,"h":3,"i":"4"},
  {"x":10,"y":0,"w":2,"h":3,"i":"5"},
  {"x":0,"y":5,"w":2,"h":5,"i":"6"},
  {"x":2,"y":5,"w":2,"h":5,"i":"7"},
  {"x":4,"y":5,"w":2,"h":5,"i":"8"},
  {"x":6,"y":4,"w":2,"h":4,"i":"9"},
  {"x":8,"y":4,"w":2,"h":4,"i":"10"},
  {"x":10,"y":4,"w":2,"h":4,"i":"11"},
  {"x":0,"y":10,"w":2,"h":5,"i":"12"},
  {"x":2,"y":10,"w":2,"h":5,"i":"13"},
  {"x":4,"y":8,"w":2,"h":4,"i":"14"},
  {"x":6,"y":8,"w":2,"h":4,"i":"15"},
  {"x":8,"y":10,"w":2,"h":5,"i":"16"},
  {"x":10,"y":4,"w":2,"h":2,"i":"17"},
  {"x":0,"y":9,"w":2,"h":3,"i":"18"},
  {"x":2,"y":6,"w":2,"h":2,"i":"19"}
];

new Vue({
  el: '#app',

  data: {
    layout: testLayout,
    index: 0,
    eventLog: []
  },

  watch: {
    eventLog() {
      var eventsDiv = this.$refs.eventsDiv;
      eventsDiv.scrollTop = eventsDiv.scrollHeight;
    }
  },

  methods: {
    moveEvent({i, newX, newY}) {
      var msg = "MOVE i=" + i + ", X=" + newX + ", Y=" + newY;
      this.eventLog.push(msg);
      console.log(msg);
    },

    movedEvent({i, newX, newY}) {
      var msg = "MOVED i=" + i + ", X=" + newX + ", Y=" + newY;
      this.eventLog.push(msg);
      console.log(msg);
    },

    resizeEvent({i, newH, newW, newHPx, newWPx}) {
      var msg = "RESIZE i=" + i + ", H=" + newH + ", W=" + newW + ", H(px)=" + newHPx + ", W(px)=" + newWPx;
      this.eventLog.push(msg);
      console.log(msg);
    },

    resizedEvent({i, newX, newY, newHPx, newWPx}) {
      var msg = "RESIZED i=" + i + ", X=" + newX + ", Y=" + newY + ", H(px)=" + newHPx + ", W(px)=" + newWPx;
      this.eventLog.push(msg);
      console.log(msg);
    }
  }
});