/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {validateData, writeScript} from '../3p/3p';

/**
 * @param {!Window} global
 * @param {!Object} data
 */
export function nativery(global, data) {
  validateData(data, ['wid']);
  const params = Object.assign({}, data);

  // push the two object into the '_nativery' global
  window._nativery =
    window._nativery ||
    Object.assign(
      {},
      {
        wid: data.wid,
        referrer: data.referrer || window.context.referrer,
        url: data.url || window.context.canonicalUrl,
        viewId: window.context.pageViewId,
        params,
      }
    );

  // must add listener for the creation of window.context
  window.addEventListener('amp-widgetCreated', function(e) {
    console.log('Nativery - AMP - Widget ready!');
    if (e && e.detail) {
      global.context.requestResize(undefined, e.detail.height);
    }
  });

  // load the nativery loader asynchronously
  writeScript(global, `https://cdn.nativery.com/widget/js/natamp.js`);
}
