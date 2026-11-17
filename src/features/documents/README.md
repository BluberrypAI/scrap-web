# 법정 서식 작성 (documents)

확정된 문진 건의 법정 서식(제6호 배출자 신고서, 제12호 처리계획서, 제5호 수탁확인서)을 입력·미리보기하고 한글(HWPX) 또는 PDF로 받는 페이지예요.

- 주소: `/wastes/case-<문진 건 ID>/documents` (`LegalFormScreen`, `layouts/AppShell.jsx`에 등록)
- 들어가는 곳: 확정한 문진 건 화면의 "서류 만들기" 버튼(`LegalFormLink`, `features/diagnosis/index.jsx`의 `afterConfirm`). 경로 추천 + 분류번호가 있을 때만 보여요.
- 페이지는 문진 건을 서버에서 다시 읽어 판정(handoff)을 얻어요.
- 제출 칸(제6·12호): 작성일, 받는 기관장, 신고인 이름, 서명·날인(직접 서명 또는 도장 이미지). 한글 파일과 PDF 모두에 들어가고 서버·브라우저 어디에도 저장하지 않아요.
- 미리보기용 서식 그림·칸 위치는 `public/legal-forms/`에 있어요. 서버의 `scripts/legal_forms_layout.py`가 만든 `resources/<kind>-layout.json`과 같아야 해요.
- 값 계산과 파일 만들기는 서버가 해요. 서버 명세: scrap-server `docs/specs/legal-forms.md`.
