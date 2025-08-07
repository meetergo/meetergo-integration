"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetergo = exports.MeetergoIntegration = void 0;
const dom_cache_1 = require("./utils/dom-cache");
const error_handler_1 = require("./utils/error-handler");
const css_injector_1 = require("./utils/css-injector");
const modal_manager_1 = require("./modules/modal-manager");
const sidebar_manager_1 = require("./modules/sidebar-manager");
const video_embed_manager_1 = require("./modules/video-embed-manager");
class MeetergoIntegration {
    // Remove unused lastActiveElement property
    constructor() {
        /**
         * Stores DOM elements with bound Meetergo scheduler events
         * @private
         */
        this.boundElements = new Map();
        this.timeouts = new Set();
        this.intervals = new Set();
        this.isInitialized = false;
        this.messageHandlers = [];
        this.intersectionObservers = [];
        try {
            const documentIsLoaded = document &&
                (document.readyState === "complete" ||
                    document.readyState === "interactive");
            if (documentIsLoaded) {
                this.init();
            }
            else {
                window.addEventListener("DOMContentLoaded", () => {
                    this.init();
                });
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Failed to initialize MeetergoIntegration',
                level: 'critical',
                context: 'MeetergoIntegration.constructor',
                error: error
            });
        }
    }
    init() {
        var _a, _b;
        try {
            if (this.isInitialized) {
                console.warn('Meetergo: Already initialized, skipping duplicate initialization');
                return;
            }
            // Inject CSS styles first
            css_injector_1.injectAllMeetergoStyles();
            // Setup event callbacks
            this.setupEventCallbacks();
            // Initialize core modules
            modal_manager_1.modalManager.initialize({
                disableModal: (_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.disableModal,
                enableAutoResize: (_b = window.meetergoSettings) === null || _b === void 0 ? void 0 : _b.enableAutoResize
            });
            // Initialize components based on settings
            this.initializeComponents();
            // Setup global event listeners
            this.addListeners();
            this.isInitialized = true;
            error_handler_1.errorHandler.handleError({
                message: 'Meetergo integration initialized successfully',
                level: 'info',
                context: 'MeetergoIntegration.init'
            }, false);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Failed to initialize Meetergo integration',
                level: 'error',
                context: 'MeetergoIntegration.init',
                error: error
            });
        }
    }
    /**
     * Setup event callbacks for all modules
     * @private
     */
    setupEventCallbacks() {
        // Setup modal event callback
        modal_manager_1.modalManager.setEventCallback((event) => {
            this.handleMeetergoEvent(event);
        });
        // Setup video event callback
        video_embed_manager_1.videoEmbedManager.setEventCallback((event) => {
            this.handleMeetergoEvent(event);
        });
    }
    /**
     * Handle Meetergo events from modules
     * @private
     */
    handleMeetergoEvent(event) {
        var _a, _b, _c;
        try {
            // Call user-defined event handler if available
            if ((_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.onEvent) {
                window.meetergoSettings.onEvent(event);
            }
            // Handle specific events internally if needed
            switch (event.type) {
                case 'booking_completed':
                    if (((_b = window.meetergoSettings) === null || _b === void 0 ? void 0 : _b.onSuccess) && 'appointmentId' in event) {
                        window.meetergoSettings.onSuccess(event.appointmentId);
                    }
                    break;
                case 'modal_error':
                    error_handler_1.errorHandler.handleError({
                        message: 'Modal error occurred',
                        level: 'warning',
                        context: 'MeetergoIntegration.handleMeetergoEvent',
                        error: (_c = event.data) === null || _c === void 0 ? void 0 : _c.error
                    });
                    break;
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error handling Meetergo event',
                level: 'warning',
                context: 'MeetergoIntegration.handleMeetergoEvent',
                error: error
            });
        }
    }
    /**
     * Initialize components based on settings
     * @private
     */
    initializeComponents() {
        var _a, _b, _c, _d, _e;
        try {
            // Initialize sidebar if configured
            if ((_b = (_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.sidebar) === null || _b === void 0 ? void 0 : _b.link) {
                sidebar_manager_1.sidebarManager.createSidebar(window.meetergoSettings.sidebar);
            }
            // Initialize floating button if configured
            if ((_c = window.meetergoSettings) === null || _c === void 0 ? void 0 : _c.floatingButton) {
                this.addFloatingButton();
            }
            // Initialize video embed if configured
            if ((_e = (_d = window.meetergoSettings) === null || _d === void 0 ? void 0 : _d.videoEmbed) === null || _e === void 0 ? void 0 : _e.videoSrc) {
                video_embed_manager_1.videoEmbedManager.createVideoEmbed(window.meetergoSettings.videoEmbed);
            }
            // Initialize form listeners
            this.listenToForms();
            // Parse existing elements
            this.parseIframes();
            this.parseButtons();
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error initializing components',
                level: 'error',
                context: 'MeetergoIntegration.initializeComponents',
                error: error
            });
        }
    }
    onFormSubmit(e) {
        var _a, _b;
        if (!(e.currentTarget instanceof HTMLFormElement))
            return;
        const target = e.currentTarget;
        if (!target)
            return;
        try {
            const targetListener = (_b = (_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.formListeners) === null || _b === void 0 ? void 0 : _b.find((listener) => {
                if (!target.id)
                    return false;
                return target.id === listener.formId;
            });
            if (!targetListener) {
                error_handler_1.errorHandler.handleError({
                    message: `No form listener found for form ID: ${target.id}`,
                    level: 'warning',
                    context: 'MeetergoIntegration.onFormSubmit'
                });
                return;
            }
            const formData = new FormData(target);
            const data = {};
            for (const [key, value] of formData) {
                data[key] = value.toString();
            }
            this.openModalWithContent({
                link: targetListener.link,
                existingParams: data,
            });
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error handling form submission',
                level: 'error',
                context: 'MeetergoIntegration.onFormSubmit',
                error: error
            });
        }
    }
    listenToForms() {
        try {
            const forms = document.querySelectorAll("form");
            for (const form of forms) {
                form.addEventListener("submit", this.onFormSubmit.bind(this), false);
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error setting up form listeners',
                level: 'warning',
                context: 'MeetergoIntegration.listenToForms',
                error: error
            });
        }
    }
    addFloatingButton() {
        var _a, _b;
        try {
            const config = (_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.floatingButton;
            if (!(config === null || config === void 0 ? void 0 : config.position) || !config.link) {
                return;
            }
            const position = config.position;
            const animation = config.animation || "none";
            let button = document.createElement("button");
            button.classList.add("meetergo-modal-button");
            const buttonText = (_b = config.text) !== null && _b !== void 0 ? _b : "Book appointment";
            if (config.icon) {
                this.loadLucideIcon(config.icon, button, buttonText);
            }
            else {
                button.innerHTML = buttonText;
            }
            button.setAttribute("link", config.link);
            button.style.position = "fixed";
            // Position the button
            this.positionFloatingButton(button, position);
            // Apply styles
            button = this.meetergoStyleButton(button);
            // Apply custom colors
            if (config.backgroundColor) {
                button.style.backgroundColor = config.backgroundColor;
            }
            if (config.textColor) {
                button.style.color = config.textColor;
            }
            // Apply animation
            this.applyButtonAnimation(button, animation, position);
            document.body.appendChild(button);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error creating floating button',
                level: 'warning',
                context: 'MeetergoIntegration.addFloatingButton',
                error: error
            });
        }
    }
    /**
     * Position floating button based on configuration
     * @private
     */
    positionFloatingButton(button, position) {
        let originalTransform = "";
        if (position.includes("top")) {
            button.style.top = "10px";
        }
        else if (position.includes("middle")) {
            button.style.top = "50%";
            originalTransform = "translateY(-50%)";
            button.style.transform = originalTransform;
        }
        else {
            button.style.bottom = "10px";
        }
        if (position.includes("left")) {
            button.style.left = "5px";
        }
        else if (position.includes("center")) {
            button.style.left = "50%";
            originalTransform = originalTransform
                ? "translate(-50%, -50%)"
                : "translateX(-50%)";
            button.style.transform = originalTransform;
        }
        else {
            button.style.right = "5px";
        }
    }
    /**
     * Apply animation to button
     * @private
     */
    applyButtonAnimation(button, animation, position) {
        if (animation === "none")
            return;
        if (animation === "pulse") {
            button.classList.add("meetergo-animation-pulse");
        }
        else if (animation === "bounce") {
            button.classList.add("meetergo-animation-bounce");
        }
        else if (animation === "slide-in") {
            if (position.includes("right")) {
                button.classList.add("meetergo-animation-slide-in-right");
            }
            else if (position.includes("left")) {
                button.classList.add("meetergo-animation-slide-in-left");
            }
            else if (position.includes("top")) {
                button.classList.add("meetergo-animation-slide-in-top");
            }
            else {
                button.classList.add("meetergo-animation-slide-in-bottom");
            }
        }
    }
    loadLucideIcon(iconName, button, buttonText) {
        button.style.display = "inline-flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.innerHTML = "";
        if (iconName) {
            const iconSpan = document.createElement("span");
            iconSpan.style.display = "inline-flex";
            iconSpan.style.alignItems = "center";
            if (buttonText) {
                iconSpan.style.marginRight = "8px";
            }
            button.appendChild(iconSpan);
            this.fetchLucideIcon(iconName, iconSpan);
        }
        if (buttonText) {
            button.appendChild(document.createTextNode(buttonText));
        }
    }
    fetchLucideIcon(iconName, container) {
        const iconMap = {
            CalendarPlus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="10" x2="14" y1="16" y2="16"/></svg>`,
            CalendarPlus2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M16 21v-6"/><path d="M19 18h-6"/></svg>`,
            Calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
            Clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            User: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a4 4 0 0 0 4 4z"/><circle cx="12" cy="7" r="4"/></svg>`
        };
        if (iconMap[iconName]) {
            container.innerHTML = iconMap[iconName];
        }
        else {
            container.innerHTML = iconMap["Calendar"];
            console.warn(`meetergo: Icon '${iconName}' not found, using default Calendar icon`);
        }
    }
    addListeners() {
        try {
            document.body.addEventListener("click", (e) => {
                const target = e.target;
                const button = target.closest(".meetergo-modal-button");
                if (button) {
                    e.preventDefault();
                    const link = button.getAttribute("link") || button.getAttribute("href");
                    if (link) {
                        this.openModalWithContent({ link });
                    }
                    else {
                        error_handler_1.errorHandler.handleError({
                            message: 'Button clicked without a link attribute',
                            level: 'warning',
                            context: 'MeetergoIntegration.addListeners'
                        });
                    }
                }
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.closeModal();
                }
            });
            window.onmessage = (e) => {
                var _a;
                try {
                    const meetergoEvent = e.data;
                    switch (meetergoEvent.event) {
                        case "open-modal": {
                            const iframeParams = this.getParamsFromMainIframe();
                            const data = meetergoEvent.data;
                            if (!data.link) {
                                error_handler_1.errorHandler.handleError({
                                    message: 'Missing link in open-modal event',
                                    level: 'error',
                                    context: 'MeetergoIntegration.addListeners'
                                });
                                return;
                            }
                            this.openModalWithContent({
                                link: data.link,
                                existingParams: Object.assign(Object.assign({}, data.params), iframeParams),
                            });
                            break;
                        }
                        case "close-modal": {
                            this.closeModal();
                            break;
                        }
                        case "booking-successful": {
                            if ((_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.onSuccess) {
                                const data = meetergoEvent.data;
                                window.meetergoSettings.onSuccess(data);
                            }
                            break;
                        }
                        default: {
                            // Ignore unrecognized events
                            break;
                        }
                    }
                }
                catch (error) {
                    error_handler_1.errorHandler.handleError({
                        message: 'Error handling message event',
                        level: 'warning',
                        context: 'MeetergoIntegration.addListeners',
                        error: error
                    });
                }
            };
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error setting up event listeners',
                level: 'error',
                context: 'MeetergoIntegration.addListeners',
                error: error
            });
        }
    }
    getParamsFromMainIframe() {
        const iframeParams = {};
        const divIframe = dom_cache_1.domCache.querySelector(".meetergo-iframe");
        if (divIframe) {
            const linkAttr = divIframe.getAttribute("link");
            if (linkAttr) {
                const queryString = linkAttr.split("?")[1];
                if (queryString) {
                    const urlParams = new URLSearchParams(queryString);
                    urlParams.forEach((value, key) => {
                        iframeParams[key] = value;
                    });
                }
            }
        }
        return iframeParams;
    }
    openModalWithContent(settings) {
        modal_manager_1.modalManager.openModalWithContent(settings);
    }
    openModal() {
        modal_manager_1.modalManager.openModal();
    }
    closeModal(preventClearContent) {
        modal_manager_1.modalManager.closeModal(preventClearContent);
    }
    /**
     * Binds the meetergo scheduler to any DOM element
     */
    bindElementToScheduler(element, schedulerLink, options) {
        try {
            if (options === null || options === void 0 ? void 0 : options.removeExistingListeners) {
                if (this.boundElements.has(element)) {
                    const oldHandler = this.boundElements.get(element);
                    if (oldHandler) {
                        element.removeEventListener("click", oldHandler);
                        this.boundElements.delete(element);
                    }
                }
            }
            const clickHandler = (e) => {
                e.preventDefault();
                const link = schedulerLink || element.getAttribute("link");
                if (!link) {
                    error_handler_1.errorHandler.handleError({
                        message: 'No scheduler link provided for bound element',
                        level: 'error',
                        context: 'MeetergoIntegration.bindElementToScheduler'
                    });
                    return;
                }
                this.openModalWithContent({
                    link,
                    existingParams: options === null || options === void 0 ? void 0 : options.params,
                });
            };
            element.addEventListener("click", clickHandler);
            this.boundElements.set(element, clickHandler);
            if (getComputedStyle(element).cursor !== "pointer") {
                element.style.cursor = "pointer";
            }
            if (!element.getAttribute("role")) {
                element.setAttribute("role", "button");
            }
            return element;
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error binding element to scheduler',
                level: 'error',
                context: 'MeetergoIntegration.bindElementToScheduler',
                error: error
            });
            return element;
        }
    }
    /**
     * Unbinds a previously bound element from the Meetergo scheduler
     */
    unbindElementFromScheduler(element) {
        try {
            if (this.boundElements.has(element)) {
                const handler = this.boundElements.get(element);
                if (handler) {
                    element.removeEventListener("click", handler);
                    this.boundElements.delete(element);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error unbinding element from scheduler',
                level: 'warning',
                context: 'MeetergoIntegration.unbindElementFromScheduler',
                error: error
            });
            return false;
        }
    }
    /**
     * Programmatically launches the Meetergo scheduler
     */
    launchScheduler(schedulerLink, params) {
        var _a, _b;
        try {
            let link = schedulerLink;
            if (!link && ((_b = (_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.floatingButton) === null || _b === void 0 ? void 0 : _b.link)) {
                link = window.meetergoSettings.floatingButton.link;
            }
            if (!link) {
                error_handler_1.errorHandler.handleError({
                    message: 'No scheduler link provided for launch',
                    level: 'error',
                    context: 'MeetergoIntegration.launchScheduler'
                });
                return;
            }
            this.openModalWithContent({ link, existingParams: params });
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error launching scheduler programmatically',
                level: 'error',
                context: 'MeetergoIntegration.launchScheduler',
                error: error
            });
        }
    }
    parseIframes() {
        try {
            const anchors = document.getElementsByClassName("meetergo-iframe");
            if (!anchors.length)
                return;
            const params = this.getPrifillParams();
            Array.from(anchors).forEach((anchor) => {
                var _a;
                try {
                    const iframe = document.createElement("iframe");
                    iframe.title = "meetergo Booking Calendar";
                    iframe.setAttribute("loading", "lazy");
                    const link = (_a = (anchor.getAttribute("link") || anchor.getAttribute("href"))) !== null && _a !== void 0 ? _a : "";
                    if (!link) {
                        console.warn("meetergo: Iframe element missing link attribute");
                        return;
                    }
                    iframe.setAttribute("src", `${link}?${params}`);
                    iframe.style.width = "100%";
                    iframe.style.border = "none";
                    iframe.style.overflow = "hidden";
                    iframe.style.display = "block";
                    // Start with reasonable default height
                    iframe.style.height = "700px";
                    iframe.style.minHeight = "500px";
                    const loadingIndicator = document.createElement("div");
                    loadingIndicator.className = "meetergo-spinner";
                    loadingIndicator.style.position = "absolute";
                    loadingIndicator.style.top = "50%";
                    loadingIndicator.style.left = "50%";
                    loadingIndicator.style.transform = "translate(-50%, -50%)";
                    const indicatorId = `meetergo-spinner-${Math.random().toString(36).substring(2, 11)}`;
                    loadingIndicator.id = indicatorId;
                    // Setup auto-resize functionality
                    this.setupIframeAutoResize(iframe);
                    iframe.addEventListener("load", () => {
                        const spinner = document.getElementById(indicatorId);
                        if (spinner && spinner.parentNode) {
                            spinner.parentNode.removeChild(spinner);
                        }
                        // Try to get initial height from iframe content
                        this.adjustIframeHeight(iframe);
                    });
                    if (anchor instanceof HTMLElement) {
                        anchor.style.position = "relative";
                        anchor.innerHTML = "";
                        anchor.appendChild(iframe);
                        anchor.appendChild(loadingIndicator);
                    }
                }
                catch (innerError) {
                    error_handler_1.errorHandler.handleError({
                        message: 'Error processing iframe element',
                        level: 'warning',
                        context: 'MeetergoIntegration.parseIframes',
                        error: innerError
                    });
                }
            });
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error parsing iframes',
                level: 'warning',
                context: 'MeetergoIntegration.parseIframes',
                error: error
            });
        }
    }
    sendScrollHeightToParent() {
        const scrollHeight = document.body.scrollHeight;
        window.parent.postMessage({ scrollHeight: scrollHeight }, "*");
    }
    /**
     * Setup auto-resize functionality for an iframe
     * Uses postMessage communication to receive height updates from the iframe content
     */
    setupIframeAutoResize(iframe) {
        try {
            const messageHandler = (event) => {
                // Security check - only accept messages from Meetergo domains
                if (!this.isValidMeetergoOrigin(event.origin)) {
                    return;
                }
                if (event.data && typeof event.data === 'object') {
                    // Handle height update messages
                    if (event.data.type === 'meetergo:height-update' && event.data.height) {
                        const newHeight = Math.max(parseInt(event.data.height, 10), 400);
                        iframe.style.height = `${newHeight}px`;
                    }
                    // Handle scroll height messages
                    if (event.data.type === 'meetergo:scroll-height' && event.data.scrollHeight) {
                        const newHeight = Math.max(parseInt(event.data.scrollHeight, 10), 400);
                        iframe.style.height = `${newHeight}px`;
                    }
                }
            };
            window.addEventListener('message', messageHandler);
            // Store the handler for cleanup
            if (!this.messageHandlers) {
                this.messageHandlers = [];
            }
            this.messageHandlers.push({ handler: messageHandler, iframe });
            // Request initial height after iframe loads
            iframe.addEventListener('load', () => {
                this.createTimeout(() => {
                    this.requestIframeHeight(iframe);
                }, 1000);
            });
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Setup iframe auto-resize failed',
                level: 'warning',
                context: 'setupIframeAutoResize',
                error: error
            });
        }
    }
    /**
     * Check if origin is a valid Meetergo domain
     */
    isValidMeetergoOrigin(origin) {
        const validOrigins = [
            'https://cal.meetergo.com',
            'https://meetergo.com',
            'https://www.meetergo.com',
            'https://app.meetergo.com'
        ];
        return validOrigins.some(validOrigin => origin.startsWith(validOrigin));
    }
    /**
     * Request height from iframe content
     */
    requestIframeHeight(iframe) {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'meetergo:request-height' }, '*');
            }
        }
        catch (error) {
            // Cross-origin restrictions may prevent this, fallback to intersection observer
            this.setupIntersectionObserver(iframe);
        }
    }
    /**
     * Fallback method using intersection observer to detect content changes
     */
    setupIntersectionObserver(iframe) {
        if (typeof IntersectionObserver === 'undefined')
            return;
        try {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this.adjustIframeHeight(iframe);
                    }
                });
            });
            observer.observe(iframe);
            // Store observer for cleanup
            if (!this.intersectionObservers) {
                this.intersectionObservers = [];
            }
            this.intersectionObservers.push(observer);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Setup intersection observer failed',
                level: 'warning',
                context: 'setupIntersectionObserver',
                error: error
            });
        }
    }
    /**
     * Try to adjust iframe height based on content
     */
    adjustIframeHeight(iframe) {
        var _a, _b;
        try {
            // This only works for same-origin iframes
            if (iframe.contentDocument) {
                const contentHeight = Math.max(((_a = iframe.contentDocument.body) === null || _a === void 0 ? void 0 : _a.scrollHeight) || 0, ((_b = iframe.contentDocument.documentElement) === null || _b === void 0 ? void 0 : _b.scrollHeight) || 0);
                if (contentHeight > 0) {
                    iframe.style.height = `${Math.max(contentHeight, 400)}px`;
                }
            }
            else {
                // Cross-origin iframe - use ResizeObserver as fallback
                this.setupResizeObserver(iframe);
            }
        }
        catch (error) {
            // Expected for cross-origin iframes
            this.setupResizeObserver(iframe);
        }
    }
    /**
     * Setup ResizeObserver for iframe container
     */
    setupResizeObserver(iframe) {
        if (typeof ResizeObserver === 'undefined')
            return;
        try {
            const observer = new ResizeObserver(() => {
                // Periodically request height updates
                this.requestIframeHeight(iframe);
            });
            if (iframe.parentElement) {
                observer.observe(iframe.parentElement);
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Setup resize observer failed',
                level: 'warning',
                context: 'setupResizeObserver',
                error: error
            });
        }
    }
    parseButtons() {
        try {
            const buttons = document.getElementsByClassName("meetergo-styled-button");
            for (let button of buttons) {
                button = this.meetergoStyleButton(button);
                if (button instanceof HTMLElement) {
                    const link = button.getAttribute("link");
                    if (link) {
                        this.bindElementToScheduler(button, link);
                    }
                }
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error parsing buttons',
                level: 'warning',
                context: 'MeetergoIntegration.parseButtons',
                error: error
            });
        }
    }
    getWindowParams() {
        try {
            const search = window.location.search;
            if (!search)
                return {};
            const params = new URLSearchParams(search);
            const paramObj = {};
            params.forEach((value, key) => {
                if (value && value.trim() !== "") {
                    paramObj[key] = value;
                }
            });
            return paramObj;
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error parsing window parameters',
                level: 'warning',
                context: 'MeetergoIntegration.getWindowParams',
                error: error
            });
            return {};
        }
    }
    getPrifillParams(existingParams) {
        var _a;
        try {
            const params = [];
            let prefill = this.getWindowParams();
            if ((_a = window.meetergoSettings) === null || _a === void 0 ? void 0 : _a.prefill) {
                // Filter out undefined values to maintain Record<string, string> type
                const filteredPrefill = {};
                Object.entries(window.meetergoSettings.prefill).forEach(([key, value]) => {
                    if (value !== undefined) {
                        filteredPrefill[key] = value;
                    }
                });
                prefill = Object.assign(Object.assign({}, prefill), filteredPrefill);
            }
            if (existingParams) {
                prefill = Object.assign(Object.assign({}, prefill), existingParams);
            }
            Object.entries(prefill).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    try {
                        const encodedKey = encodeURIComponent(key);
                        const encodedValue = encodeURIComponent(String(value));
                        params.push(`${encodedKey}=${encodedValue}`);
                    }
                    catch (encodingError) {
                        console.warn(`meetergo: Error encoding parameter ${key}`, encodingError);
                    }
                }
            });
            return params.join("&");
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error generating prefill parameters',
                level: 'warning',
                context: 'MeetergoIntegration.getPrifillParams',
                error: error
            });
            return "";
        }
    }
    setPrefill(prefill) {
        try {
            if (!prefill) {
                console.warn("meetergo: Attempted to set undefined or null prefill");
                return;
            }
            if (!window.meetergoSettings) {
                console.warn("meetergo: Settings object not initialized");
                window.meetergoSettings = {
                    company: "",
                    formListeners: [],
                    prefill: {},
                };
            }
            // Filter out undefined values to maintain Record<string, string> type
            const filteredPrefill = {};
            Object.entries(prefill).forEach(([key, value]) => {
                if (value !== undefined) {
                    filteredPrefill[key] = value;
                }
            });
            window.meetergoSettings.prefill = filteredPrefill;
            if (modal_manager_1.modalManager.isModalOpen()) {
                this.refreshModalWithNewPrefill();
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error setting prefill values',
                level: 'warning',
                context: 'MeetergoIntegration.setPrefill',
                error: error
            });
        }
    }
    refreshModalWithNewPrefill() {
        try {
            const modalContent = dom_cache_1.domCache.getElementById("meetergo-modal-content");
            if (!modalContent)
                return;
            const iframe = modalContent.querySelector("iframe");
            if (!iframe)
                return;
            const currentSrc = iframe.getAttribute("src");
            if (!currentSrc)
                return;
            const linkBase = currentSrc.split("?")[0];
            const params = this.getPrifillParams();
            iframe.setAttribute("src", `${linkBase}?${params}`);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error refreshing modal with new prefill',
                level: 'warning',
                context: 'MeetergoIntegration.refreshModalWithNewPrefill',
                error: error
            });
        }
    }
    meetergoStyleButton(button) {
        try {
            if (!button) {
                console.warn("meetergo: Attempted to style undefined button");
                return button;
            }
            const styles = {
                margin: "0.5rem",
                padding: "0.8rem",
                fontWeight: "bold",
                color: "white",
                backgroundColor: "#0A64BC",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                zIndex: "999",
                transition: "background-color 0.3s ease",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            };
            Object.assign(button.style, styles);
            if (!button.getAttribute("role")) {
                button.setAttribute("role", "button");
            }
            return button;
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error styling button',
                level: 'warning',
                context: 'MeetergoIntegration.meetergoStyleButton',
                error: error
            });
            return button;
        }
    }
    /**
     * Create a timeout with automatic tracking
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Timeout ID
     */
    createTimeout(callback, delay) {
        const timeoutId = window.setTimeout(() => {
            this.timeouts.delete(timeoutId);
            callback();
        }, delay);
        this.timeouts.add(timeoutId);
        return timeoutId;
    }
    /**
     * Create an interval with automatic tracking
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Interval ID
     */
    createInterval(callback, delay) {
        const intervalId = window.setInterval(callback, delay);
        this.intervals.add(intervalId);
        return intervalId;
    }
    /**
     * Clear a tracked timeout
     * @param timeoutId Timeout ID to clear
     */
    clearTrackedTimeout(timeoutId) {
        window.clearTimeout(timeoutId);
        this.timeouts.delete(timeoutId);
    }
    /**
     * Clear a tracked interval
     * @param intervalId Interval ID to clear
     */
    clearTrackedInterval(intervalId) {
        window.clearInterval(intervalId);
        this.intervals.delete(intervalId);
    }
    /**
     * Cleanup method that removes all event listeners, timeouts, intervals, and DOM elements
     */
    destroy() {
        try {
            // Clear all timeouts
            this.timeouts.forEach(timeoutId => {
                window.clearTimeout(timeoutId);
            });
            this.timeouts.clear();
            // Clear all intervals
            this.intervals.forEach(intervalId => {
                window.clearInterval(intervalId);
            });
            this.intervals.clear();
            // Unbind all bound elements
            this.boundElements.forEach((handler, element) => {
                try {
                    element.removeEventListener("click", handler);
                }
                catch (error) {
                    // Element might have been removed from DOM
                }
            });
            this.boundElements.clear();
            // Clean up message handlers
            this.messageHandlers.forEach(({ handler }) => {
                try {
                    window.removeEventListener('message', handler);
                }
                catch (error) {
                    // Handler might already be removed
                }
            });
            this.messageHandlers = [];
            // Clean up intersection observers
            this.intersectionObservers.forEach(observer => {
                try {
                    observer.disconnect();
                }
                catch (error) {
                    // Observer might already be disconnected
                }
            });
            this.intersectionObservers = [];
            // Cleanup all modules
            modal_manager_1.modalManager.cleanup();
            sidebar_manager_1.sidebarManager.cleanup();
            video_embed_manager_1.videoEmbedManager.cleanup();
            error_handler_1.errorHandler.cleanup();
            css_injector_1.cssInjector.cleanup();
            // Clear DOM cache
            dom_cache_1.domCache.clearCache();
            // Remove floating buttons
            const floatingButtons = document.querySelectorAll('.meetergo-modal-button');
            floatingButtons.forEach(button => {
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                }
            });
            // Reset state
            this.isInitialized = false;
            console.log('Meetergo integration destroyed successfully');
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error during cleanup',
                level: 'warning',
                context: 'MeetergoIntegration.destroy',
                error: error
            });
        }
    }
    /**
     * Check if integration is initialized
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Get integration status and statistics
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            boundElements: this.boundElements.size,
            activeTimeouts: this.timeouts.size,
            activeIntervals: this.intervals.size,
            cacheStats: dom_cache_1.domCache.getCacheStats()
        };
    }
}
exports.MeetergoIntegration = MeetergoIntegration;
exports.meetergo = new MeetergoIntegration();
//# sourceMappingURL=main.js.map