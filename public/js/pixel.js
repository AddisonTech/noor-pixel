(function() {
  function sendEvent(eventName, data) {
    var img = new Image();
    img.src = '/api/collect?event=' + encodeURIComponent(eventName) +
      '&data=' + encodeURIComponent(JSON.stringify(data)) +
      '&t=' + Date.now();
  }

  window.noorPixel = {
    track: function(eventName, data) {
      sendEvent(eventName, data || {});
    }
  };
})();
