import * as React from 'react';
import { createTreatmentUI } from './treatment-ui.jsx';

// 처리경로 화면 컴포넌트 모음 (Confirm, Panel, SavedTab, Summary, SurveyMaterial)
export const scrapTreatment = createTreatmentUI(React);
