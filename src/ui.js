import xtend from 'xtend';
import * as Constants from './constants';
import { SRCenter } from './lib/SRCenter';

const classTypes = ['mode', 'feature', 'mouse'];

export default function(ctx) {
  const buttonElements = {};
  let activeButton = null;

  let currentMapClasses = {
    mode: null, // e.g. mode-direct_select
    feature: null, // e.g. feature-vertex
    mouse: null // e.g. mouse-move
  };

  let nextMapClasses = {
    mode: null,
    feature: null,
    mouse: null
  };

  function clearMapClasses() {
    queueMapClasses({mode:null, feature:null, mouse:null});
    updateMapClasses();
  }

  function queueMapClasses(options) {
    nextMapClasses = xtend(nextMapClasses, options);
  }

  function updateMapClasses() {
    if (!ctx.container) return;

    const classesToRemove = [];
    const classesToAdd = [];

    classTypes.forEach((type) => {
      if (nextMapClasses[type] === currentMapClasses[type]) return;

      classesToRemove.push(`${type}-${currentMapClasses[type]}`);
      if (nextMapClasses[type] !== null) {
        classesToAdd.push(`${type}-${nextMapClasses[type]}`);
      }
    });

    if (classesToRemove.length > 0) {
      ctx.container.classList.remove(...classesToRemove);
    }

    if (classesToAdd.length > 0) {
      ctx.container.classList.add(...classesToAdd);
    }

    currentMapClasses = xtend(currentMapClasses, nextMapClasses);
  }

  function createControlButton(id, options = {}) {
    const button = document.createElement('button');
    button.className = `${Constants.classes.CONTROL_BUTTON} ${options.className}`;
    button.setAttribute('title', options.title);
    options.container.appendChild(button);

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const clickedButton = e.target;
      if (clickedButton === activeButton) {
        deactivateButtons();
        options.onDeactivate();
        return;
      }

      setActiveButton(id);
      options.onActivate();
    }, true);

    return button;
  }

  function deactivateButtons() {
    if (!activeButton) return;
    activeButton.classList.remove(Constants.classes.ACTIVE_BUTTON);
    activeButton = null;
  }

  function setActiveButton(id) {
    deactivateButtons();

    const button = buttonElements[id];
    if (!button) return;

    if (button && id !== 'trash') {
      button.classList.add(Constants.classes.ACTIVE_BUTTON);
      activeButton = button;
    }
  }

  function addButtons() {
    const controls = ctx.options.controls;
    const controlGroup = document.createElement('div');
    controlGroup.className = `${Constants.classes.CONTROL_GROUP} ${Constants.classes.CONTROL_BASE}`;

    if (!controls) return controlGroup;

    // kt / point -> line -> polygon 순서로 버튼 표출
    if (controls[Constants.types.POINT]) {
      buttonElements[Constants.types.POINT] = createControlButton(Constants.types.POINT, {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_POINT,
        title: `Marker tool ${ctx.options.keybindings ? '(m)' : ''}`,
        onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_POINT),
        onDeactivate: () => ctx.events.trash()
      });
    }
    
    if (controls[Constants.types.LINE]) {
      buttonElements[Constants.types.LINE] = createControlButton(Constants.types.LINE, {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_LINE,
        title: `LineString tool ${ctx.options.keybindings ? '(l)' : ''}`,
        onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_LINE_STRING),
        onDeactivate: () => ctx.events.trash()
      });
    }

    if (controls[Constants.types.POLYGON]) {
      buttonElements[Constants.types.POLYGON] = createControlButton(Constants.types.POLYGON, {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_POLYGON,
        title: `Polygon tool ${ctx.options.keybindings ? '(p)' : ''}`,
        onActivate: () => ctx.events.changeMode(Constants.modes.DRAW_POLYGON),
        onDeactivate: () => ctx.events.trash()
      });
    }

    if (controls.trash) {
      buttonElements.trash = createControlButton('trash', {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_TRASH,
        title: 'Delete',
        onActivate: () => {
          ctx.events.trash();
        }
      });
    }

    if (controls.combine_features) {
      buttonElements.combine_features = createControlButton('combineFeatures', {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_COMBINE_FEATURES,
        title: 'Combine',
        onActivate: () => {
          ctx.events.combineFeatures();
        }
      });
    }

    if (controls.uncombine_features) {
      buttonElements.uncombine_features = createControlButton('uncombineFeatures', {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_UNCOMBINE_FEATURES,
        title: 'Uncombine',
        onActivate: () => {
          ctx.events.uncombineFeatures();
        }
      });
    }

    // kt / SRMode 생성
    // kt / buttonEvent 생성
    if (controls.srmode) {
      buttonElements.srmode = createControlButton('srmode', {
        container: controlGroup,
        className: Constants.classes.CONTROL_BUTTON_SRMODE,
        title: 'SRMode',
        onActivate: () => {
          let tmp = ctx.store.getSelected();
          // feature 없이 선택 | point 선택 후 SRMode 진입 불가능하게 & 버튼 클래스 변경 막기
          if(tmp.length === 0 || tmp[0].type === "Point" || tmp[0].type === "MultiPoint"){
            deactivateButtons();
            return;
          }
          ctx.events.changeMode('SRMode', {
              canScale: true,
              canRotate: true, // only rotation enabled
              canTrash: false, // disable feature delete
            
              rotatePivot: SRCenter.Center, // rotate around center
              scaleCenter: SRCenter.Opposite, // scale around opposite vertex
            
              singleRotationPoint: true, // only one rotation point
              rotationPointRadius: 1.2, // offset rotation point
            
              canSelectFeatures: true,
            });
        },
        onDeactivate: () => {
          // simple_select 모드로 변경
          ctx.events.changeMode(Constants.modes.SIMPLE_SELECT);
        }
      });
    }

    return controlGroup;
  }

  function removeButtons() {
    Object.keys(buttonElements).forEach((buttonId) => {
      const button = buttonElements[buttonId];
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
      delete buttonElements[buttonId];
    });
  }

  // 버튼 비활성 export
  return {
    setActiveButton,
    queueMapClasses,
    updateMapClasses,
    clearMapClasses,
    addButtons,
    removeButtons,
    deactivateButtons
  };
}
