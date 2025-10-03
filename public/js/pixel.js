(function () {
  const VERCEL_URL = "https://noor-pixel.vercel.app";

  function sendEvent(eventName, data) {
    var img = new Image();
    var payload = Object.assign(
      { event: eventName, ts: Date.now(), url: location.href },
      data || {}
    );
    img.src = VERCEL_URL + "/api/p.gif?d=" + encodeURIComponent(JSON.stringify(payload));
  }

  window.noorPixel = {
    track: function (eventName, data) {
      sendEvent(eventName, data || {});
    }
  };
})();


