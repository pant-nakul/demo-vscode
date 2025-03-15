class WorkbenchLoader {
  private readonly loadingOverlay: HTMLElement;
  private readonly loadingText: HTMLElement;
  private readonly workbenchContainer: HTMLDivElement;
  
  constructor() {
    const overlay = document.getElementById('loading-overlay');
    const text = overlay?.querySelector('.loading-text');
    
    if (!overlay || !(text instanceof HTMLElement)) {
      throw new Error('Required DOM elements not found');
    }
    
    this.loadingOverlay = overlay;
    this.loadingText = text;
    this.workbenchContainer = this.createWorkbenchContainer();
  }

  private createWorkbenchContainer(): HTMLDivElement {
    // Add fullscreen styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';

    // Add styles for iframe content
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    
    const container = document.createElement('div');
    container.id = 'workbench-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease-out';
    container.style.zIndex = '1';
    
    const frame = this.createWorkbenchFrame();
    container.appendChild(frame);
    document.body.appendChild(container);
    
    return container;
  }

  private createWorkbenchFrame(): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.id = 'workbench-frame';
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = 'none';
    
    const currentUrl = new URL(window.location.href);
    const queryParams = new URLSearchParams(currentUrl.search);
    const transformedParams = new URLSearchParams();
    
    queryParams.forEach((value, key) => {
      transformedParams.append(key, value);
    });
    
    transformedParams.append('workbench', 'true');
    frame.src = `${window.location.pathname}?${transformedParams.toString()}`;
    
    return frame;
  }

  /**
   * recursively look for an iframe that has an id related to the extension
   * by default, id=root, can be made more specific/unique if needed.
   */
  private findExtensionElement(doc: Document, id : string = 'root'): boolean {
    if (doc.getElementById(id)) {
      return true;
    }

    const frames = doc.getElementsByTagName('iframe');
    for (let i = 0; i < frames.length; i++) {
      try {
        const frameDoc = (frames[i] as HTMLIFrameElement).contentWindow?.document;
        if (frameDoc && this.findExtensionElement(frameDoc)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  private async waitForExtensionElement(): Promise<void> {
    const frame = document.getElementById('workbench-frame') as HTMLIFrameElement;
    if (!frame) throw new Error('Workbench frame not found');

    return new Promise((resolve) => {
      const scanElement = () => {
        try {
          const innerDoc = (frame.contentWindow as Window)?.document;
          if (innerDoc && this.findExtensionElement(innerDoc)) {
            resolve();
            return;
          }
        } catch (e) {
        }
        requestAnimationFrame(scanElement);
      };
      scanElement();
    });
  }

  private async runSetupSteps() {
    const steps = [
      { message: "Initializing development environment...", duration: 2000 },
      { message: "Configuring VS Code settings...", duration: 2000 },
      { message: "Loading extensions...", duration: 1800 },
      { message: "Setting up development tools...", duration: 1800 },
      { message: "Configuring user preferences...", duration: 1800 },
      { message: "Starting VS Code server...", duration: 1500 }
    ];

    for (const step of steps) {
      this.loadingText.textContent = step.message;
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    await this.finishSetup();
  }


  private async finishSetup() {
    this.loadingText.textContent = "Waiting for workspace to initialize...";
    
    // Set up reload timer if initialization takes too long
    let reloadTimer:any = null
    let loadingTextTimer:any = null
    const mobile_width:any = 500
    if (window.innerWidth < mobile_width) {
      reloadTimer = setTimeout(() => {
        console.log('Workspace initialization timeout - reloading page');
        window.location.reload();
      }, 15000);
    } else {
      // For desktop screens, change loading text after 10 seconds
      loadingTextTimer = setTimeout(() => {
        this.loadingText.textContent = "Witnessing High Demand. Please try again in a few minutes...";
      }, 15_000);
    }
    
    await this.waitForExtensionElement();
    
    if (window.innerWidth < mobile_width) {
      // Clear reload timer since initialization succeeded
      clearTimeout(reloadTimer);
    } else {
      // Clear loading text timer since initialization succeeded
      clearTimeout(loadingTextTimer);
    }
    
    // at this point, extension frame is loaded, but added extra wait time in case we want to wait for pro / send prompt to take action
    this.loadingText.textContent = "Finalizing workspace...";
    await new Promise(resolve => setTimeout(resolve, 1800));

    const sandboxId = localStorage.getItem('webvscode-sandbox');
    if (sandboxId && !new URLSearchParams(window.location.search).has('sandbox')) {
      const newParams = new URLSearchParams();
      newParams.set('sandbox', sandboxId);
      window.history.replaceState({}, '', `${window.location.pathname}?${newParams}`);
    }

    this.loadingOverlay.classList.add('hidden');
    this.workbenchContainer.style.opacity = '1';
    
    setTimeout(() => {
      this.loadingOverlay.remove();
    }, 300);
  }

  public async load() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hasSandbox = urlParams.has('sandbox');
      const hasText = urlParams.has('text');
      const hasLanguage = urlParams.has('language');

      // TODO: this rewrites url params to local storage in all cases, including reload
      // this is only useful if the sandbox is created outside cybercoder.ai
      // and only sandbox id might be relevent, but for now rewriting all url params
      for (const [key, value] of urlParams.entries()) {
        localStorage.setItem(`webvscode-${key}`, value);
        console.log(`Saved ${key} to local storage:`, value);
      }

      // Clear all URL parameters except 'sandbox'
      const sandboxValue = urlParams.get('sandbox');
      const newUrl = new URL(window.location.href);
      newUrl.search = sandboxValue ? `?sandbox=${sandboxValue}` : '';
      window.history.replaceState({}, '', newUrl.toString());

      // Skip loading steps if we have text/language parameters
      if (hasText || hasLanguage) {
        await this.finishSetup();
      } else if (!hasSandbox) {
        await this.runSetupSteps();
      } else {
        await this.finishSetup();
      }
    } catch (error) {
      console.error('Error during workbench loading:', error);
    }
  }
}

const loadWorkbench = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isWorkbench = urlParams.has('workbench');
    const hasText = urlParams.has('text');
    
    // Skip loader for text parameter or workbench
    if (hasText || isWorkbench) {
      await import('./loader');
      return;
    }

    const loader = new WorkbenchLoader();
    await loader.load();
  } catch (error) {
    console.error('Error loading workbench:', error);
  }
};

loadWorkbench();

export {};
