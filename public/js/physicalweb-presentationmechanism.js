/**
 * @fileOverview Implements a presentation mechanism compatible with the
 * Presentation API polyfill [1] that broadcasts the presentation URL
 * using a Physical Web beacon.
 *
 * Since a browser cannot broadcast the URL itself, the presentation mechanism
 * goes through the Node.js backend to have the URL broadcasted. Ideally, that
 * part would be natively supported by Web browsers.
 *
 * NB: the Presentation API polyfill must have been loaded before that
 * JavaScript file gets loaded (it references classes that the polyfill
 * exposes).
 *
 * [1] https://webscreens.github.io/slidyremote/presentation-api-shim.js
 */
(function () {
  // Retrieve classes that the Presentation API polyfill exposes so that we
  // may define and register our new Physical Web presentation mechanism.
  var ns = navigator.w3cPresentation.extend;
  var _DOMException = ns._DOMException;
  var RemoteController = ns.RemoteController;
  var Display = ns.Display;
  var PresentationMechanism = ns.PresentationMechanism;
  var registerPresentationMechanism = ns.registerPresentationMechanism;


  /**
   * Represents the controlling browsing context as seen by the receiving
   * browsing context. In practice, the receiving context does not see
   * anything since it only had access to the URL that was broadcasted by
   * the Physical Web beacon.
   *
   * @constructor
   * @inherits {RemoteController}
   */
  var PhysicalWebRemoteController = function () {
    RemoteController.call(this);

    /**
     * No way to create a data channel since the receiving side cannot
     * directly communicate with the controlling device, so the data
     * channel creation simple hangs on forever.
     *
     * @function
     * @return {Promise<DataChannel>} The promise to get a data communication
     * channel ready for exchanging messages with the remote controller
     */
    this.createDataChannel = function () {
      return new Promise(function (resolve, reject) {
        console.info('no possible "native" data channel with Physical Web');
      });
    };
  };


  /**
   * Represents a Physical Web "display". In practice, this represents the
   * possibility to have the URL broadcasted by a Physical Web beacon.
   *
   * @constructor
   * @inherits {Display}
   * @param {String} name A human-friendly name for that type of display
   */
  var PhysicalWebDisplay = function (name) {
    Display.call(this, name);

    /**
     * "Navigate" the "display" to the given URL, thus creating a receiving
     * browsing context.
     *
     * For this Physical Web mechanism, navigation means starting to
     * broadcast the given URL on the Physical Web beacon, hoping that
     * someone will pick it up. In other words, when the Promise returned
     * by this function resolves, all we know is that someone may connect.
     *
     * @function
     * @param {String} url The URL to navigate to
     * @return {Promise} The promise to have navigated to the given URL. The
     * promise is rejected with a DOMException named "OperationError"
     */
    this.navigate = function (url) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:3000/api/beacon');
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
          resolve();
        };
        xhr.send('action=start&url=' + encodeURIComponent(url + '?p'));
        xhr.onerror = function(e) {
          reject(new _DOMException(
            'Unable to start Bluetooth beacon: ' + JSON.stringify(e),
            'OperationError'));
        };
      });
    };


    /**
     * No way to create a data channel since the receiving side cannot
     * directly communicate with the controlling device, so the data
     * channel creation simple hangs on forever.
     *
     * @function
     * @return {Promise<DataChannel>} The promise to get a data communication
     * channel ready for exchanging messages with the remote controller
     */
    this.createDataChannel = function () {
      return new Promise(function (resolve, reject) {
        console.info('no possible "native" data channel with Physical Web');
      });
    };


    /**
     * Terminates the presentation with the display, meaning stop
     * broadcasting the URL
     */
    this.terminate = function () {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:3000/api/beacon');
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      xhr.send('action=stop&url=' + encodeURIComponent(url + '?p'));
    };
  };


  /**
   * The actual Physical Web presentation mechanism that will be registered
   * on the Presentation API prototype.
   */
  var PhysicalWebPresentationMechanism = function () {
    PresentationMechanism.call(this);
    this.name = 'Physical Web presentation mechanism';

    var that = this;

    // TODO: can the backend return the list of beacons available by any
    // chance? This could be used to populate the list instead of providing
    // a generic class of displays
    this.getAvailableDisplays = function () {
      return new Promise(function (resolve, reject) {
        resolve([new PhysicalWebDisplay('Broadcast the URL through a Physical Web beacon')]);
      });
    };

    this.monitorIncomingControllers = function () {
      // Not many choices to tell whether the code is running in a receiving
      // browsing context: we'll just use the presence of a "presentation"
      // query string parameter
      if (window.location.search.indexOf('?p') === -1) {
        console.log('not running in a receiving context created by Physical Web');
        return;
      }

      console.log('running in a receiving context created by Physical Web');
      var controller = new PhysicalWebRemoteController();
      if (that.onincomingcontroller) {
        that.onincomingcontroller(controller);
      }
    };
  };

  registerPresentationMechanism(new PhysicalWebPresentationMechanism());
})();