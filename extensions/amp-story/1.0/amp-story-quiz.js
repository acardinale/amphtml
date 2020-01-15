/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
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

import {
  ANALYTICS_TAG_NAME,
  StoryAnalyticsEvent,
  getAnalyticsService,
} from './story-analytics';
import {AnalyticsVariable, getVariableService} from './variable-service';
import {CSS} from '../../../build/amp-story-quiz-1.0.css';
import {StateProperty, getStoreService} from './amp-story-store-service';
import {closest} from '../../../src/dom';
import {createShadowRootWithStyle} from './utils';
import {dev} from '../../../src/log';
import {htmlFor} from '../../../src/static-template';
import {toArray} from '../../../src/types';

/** @const {!Array<string>} */
const answerChoiceOptions = ['A', 'B', 'C', 'D'];

/** @const {string} */
const TAG = 'amp-story-quiz';

// TODO(jackbsteinberg): Refactor quiz to extend a general interactive element class
// and make this an enum on that class.
/** @const {number} */
const STORY_REACTION_TYPE_QUIZ = 0;

/**
 * Generates the template for the quiz.
 *
 * @param {!Element} element
 * @return {!Element}
 */
const buildQuizTemplate = element => {
  const html = htmlFor(element);
  return html`
    <div class="i-amphtml-story-quiz-container">
      <div class="i-amphtml-story-quiz-prompt-container"></div>
      <div class="i-amphtml-story-quiz-option-container"></div>
    </div>
  `;
};

/**
 * Generates the template for each option.
 *
 * @param {!Element} option
 * @return {!Element}
 */
const buildOptionTemplate = option => {
  const html = htmlFor(option);
  return html`
    <span class="i-amphtml-story-quiz-option">
      <span class="i-amphtml-story-quiz-answer-choice"></span>
    </span>
  `;
};

export class AmpStoryQuiz extends AMP.BaseElement {
  /**
   * @param {!AmpElement} element
   */
  constructor(element) {
    super(element);

    /** @private @const {!./story-analytics.StoryAnalyticsService} */
    this.analyticsService_ = getAnalyticsService(this.win, element);

    /** @private {boolean} */
    this.hasReceivedResponse_ = false;

    /** @private {?Element} */
    this.quizEl_ = null;

    /** @private @const {!./amp-story-store-service.AmpStoryStoreService} */
    this.storeService_ = getStoreService(this.win);

    /** @const @private {!./variable-service.AmpStoryVariableService} */
    this.variableService_ = getVariableService(this.win);
  }

  /** @override */
  buildCallback() {
    this.quizEl_ = buildQuizTemplate(this.element);
    this.adjustGridLayer_();
    this.attachContent_();
    this.initializeListeners_();
    createShadowRootWithStyle(this.element, this.quizEl_, CSS);
  }

  /**
   * Reacts to RTL state updates and triggers the UI for RTL.
   *
   * @param {boolean} rtlState
   * @private
   */
  onRtlStateUpdate_(rtlState) {
    this.mutateElement(() => {
      rtlState
        ? this.quizEl_.setAttribute('dir', 'rtl')
        : this.quizEl_.removeAttribute('dir');
    });
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout === 'container';
  }

  /**
   * @return {?Element}
   */
  getQuizElement() {
    return this.quizEl_;
  }

  /**
   * Add classes to adjust the bottom padding on the grid-layer
   * to prevent overlap with the quiz.
   *
   * @private
   */
  adjustGridLayer_() {
    const gridLayer = closest(dev().assertElement(this.element), el => {
      return el.tagName.toLowerCase() === 'amp-story-grid-layer';
    });

    gridLayer.classList.add('i-amphtml-story-has-quiz');

    if (gridLayer.parentElement.querySelector('amp-story-cta-layer')) {
      gridLayer.classList.add('i-amphtml-story-has-CTA-layer');
    }

    if (gridLayer.parentElement.querySelector('amp-story-page-attachment')) {
      gridLayer.classList.add('i-amphtml-story-has-page-attachment');
    }
  }

  /**
   * Finds the prompt and options content
   * and adds it to the quiz element.
   *
   * @private
   */
  attachContent_() {
    // TODO(jackbsteinberg): Optional prompt behavior must be implemented here
    const promptInput = this.element.children[0];
    // First child must be heading h1-h3
    if (!['h1', 'h2', 'h3'].includes(promptInput.tagName.toLowerCase())) {
      dev().error(
        TAG,
        'The first child must be a heading element <h1>, <h2>, or <h3>'
      );
    }

    const prompt = document.createElement(promptInput.tagName);
    prompt.textContent = promptInput.textContent;
    prompt.classList.add('i-amphtml-story-quiz-prompt');
    this.element.removeChild(promptInput);

    const options = toArray(this.element.querySelectorAll('option'));
    if (options.length < 2 || options.length > 4) {
      dev().error(TAG, 'Improper number of options');
    }

    this.quizEl_
      .querySelector('.i-amphtml-story-quiz-prompt-container')
      .appendChild(prompt);

    options.forEach((option, index) => this.configureOption_(option, index));

    if (this.element.children.length !== 0) {
      dev().error(TAG, 'Too many children');
    }
  }

  /**
   * Creates an option container with option content,
   * adds styling and answer choices,
   * and adds it to the quiz element.
   *
   * @param {Element} option
   * @param {number} index
   * @private
   */
  configureOption_(option, index) {
    const convertedOption = buildOptionTemplate(dev().assertElement(option));

    // Fill in the answer choice and set the option ID
    convertedOption.querySelector(
      '.i-amphtml-story-quiz-answer-choice'
    ).textContent = answerChoiceOptions[index];
    convertedOption.optionIndex_ = index;

    // Extract and structure the option information
    const optionText = document.createElement('span');
    optionText.classList.add('i-amphtml-story-quiz-option-text');
    optionText.textContent = option.textContent;
    convertedOption.appendChild(optionText);

    if (option.hasAttribute('correct')) {
      convertedOption.setAttribute('correct', 'correct');
    }
    this.element.removeChild(option);

    this.quizEl_
      .querySelector('.i-amphtml-story-quiz-option-container')
      .appendChild(convertedOption);
  }

  /**
   * Attaches functions to each option to handle state transition.
   *
   * @private
   */
  initializeListeners_() {
    // Add a listener for changes in the RTL state
    this.storeService_.subscribe(
      StateProperty.RTL_STATE,
      rtlState => {
        this.onRtlStateUpdate_(rtlState);
      },
      true /** callToInitialize */
    );

    // Add a click listener to the element to trigger the class change
    this.quizEl_.addEventListener('click', e => this.handleTap_(e));
  }

  /**
   * Handles a tap event on the quiz element.
   *
   * @param {Event} e
   * @private
   */
  handleTap_(e) {
    if (this.hasReceivedResponse_) {
      return;
    }

    const optionEl = closest(
      dev().assertElement(e.target),
      element => {
        return element.classList.contains('i-amphtml-story-quiz-option');
      },
      this.quizEl_
    );

    if (optionEl) {
      this.handleOptionSelection_(optionEl);
    }
  }

  /**
   * Triggers the analytics event for quiz response.
   *
   * @param {!Element} optionEl
   * @private
   */
  triggerAnalytics_(optionEl) {
    this.variableService_.onVariableUpdate(
      AnalyticsVariable.STORY_REACTION_ID,
      this.element.getAttribute('id')
    );
    this.variableService_.onVariableUpdate(
      AnalyticsVariable.STORY_REACTION_RESPONSE,
      optionEl.optionIndex_
    );
    this.variableService_.onVariableUpdate(
      AnalyticsVariable.STORY_REACTION_TYPE,
      STORY_REACTION_TYPE_QUIZ
    );

    this.element[ANALYTICS_TAG_NAME] = 'amp-story-quiz';
    this.analyticsService_.triggerEvent(
      StoryAnalyticsEvent.REACTION,
      this.element
    );
  }

  /**
   * Triggers changes to quiz state on response interaction.
   *
   * @param {!Element} optionEl
   * @private
   */
  handleOptionSelection_(optionEl) {
    this.triggerAnalytics_(optionEl);

    this.mutateElement(() => {
      optionEl.classList.add('i-amphtml-story-quiz-option-selected');
      this.quizEl_.classList.add('i-amphtml-story-quiz-post-selection');

      this.hasReceivedResponse_ = true;
    });
  }
}
