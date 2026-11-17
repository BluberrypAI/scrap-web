# 법정 서식 작성 (documents)

확정된 문진 건의 법정 서식(제6호 배출자 신고서, 제12호 처리계획서, 제5호 수탁확인서)을 입력·미리보기하고 한글(HWPX) 또는 PDF로 받는 화면이에요. 아직 어디에도 연결하지 않았어요.

- 붙이는 법: 확정된 문진 건 화면(`features/diagnosis/index.jsx`의 `afterConfirm`)에서
  `import { LegalFormPanel } from '../documents/LegalFormPanel.jsx'` 후 `<LegalFormPanel caseId={id} handoff={handoff} />`.
  경로 추천 + 분류번호가 있을 때만 보이고, 아니면 아무것도 그리지 않아요.
- 제출 칸(제6·12호): 작성일, 받는 기관장, 신고인 이름, 서명 패드. 서명은 PDF에만 들어가고 서버·브라우저 어디에도 저장하지 않아요.
- 미리보기용 서식 그림·칸 위치는 `public/legal-forms/`에 있어요. 서버의 `scripts/legal_forms_layout.py`가 만든 `resources/<kind>-layout.json`과 같아야 해요.
- 값 계산과 파일 만들기는 서버가 해요. 서버 명세: scrap-server `docs/specs/legal-forms.md`.
