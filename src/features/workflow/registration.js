export async function registerLot(create, values) {
  const massKg = Number(values.massKg);
  if (!Number.isFinite(massKg) || massKg <= 0 || massKg > 1e9) {
    throw new Error('중량을 0보다 크고 1,000,000,000kg 이하인 숫자로 입력해 주세요.');
  }
  const condition = values.condition.trim();
  if (condition.length < 3 || condition.length > 1500) {
    throw new Error('현재 상태 설명을 3자 이상 1,500자 이하로 입력해 주세요.');
  }
  const lot = await create({ ...values, massKg, condition });
  if (!lot?.id || !lot?.data?.current) throw new Error('등록 결과를 확인하지 못했어요. 다시 시도해 주세요.');
  return lot;
}
