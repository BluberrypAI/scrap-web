import { useState } from 'react';
import { ExitConfirmModal } from '../../components/ExitConfirmModal.jsx';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { useExitGuard } from '../../hooks/useExitGuard.js';

export function TaskPlaceholder({ waste, task }) {
  let n = task === 'match' ? '처리 경로 선택' : '처리 결과지',
    [r, i] = useState(false);
  return (
    useExitGuard(i),
    (
      <div className="l3-page">
        <WorkBar waste={waste} saveState="saved" onExit={() => i(true)} />
        <main className="l3-task-placeholder">
          <div>
            <Icon name={task === 'report' ? 'check' : 'spark'} size={31} />
            <p>L3 TASK</p>
            <h1>{n}</h1>
            <span>
              {waste.name}
              {'의 '}
              {n}
              {' 화면으로 연결되었습니다.'}
            </span>
          </div>
        </main>
        {r && <ExitConfirmModal waste={waste} onContinue={() => i(false)} />}
      </div>
    )
  );
}
