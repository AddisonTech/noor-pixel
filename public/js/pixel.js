(function() {
  const VERCEL_URL = "https://noor-pixel.vercel.app"; // <-- change this

  function sendEvent(eventName, data) {
    var img = new Image();
    img.src = VERCEL_URL + '/api/collect?event=' + encodeURIComponent(eventName) +
      '&data=' + encodeURIComponent(JSON.stringify(data)) +
      '&t=' + Date.now();
  }

  window.noorPixel = {
    track: function(eventName, data) {
      sendEvent(eventName, data || {});
    }
  };
})();

