select case when count(*) filter (where not ok) = 0 then 'TODAS LAS PRUEBAS PASARON' else 'HAY FALLOS' end || ' — ' || count(*) filter (where ok) || ' correctas, ' || count(*) filter (where not ok) || ' fallidas' as resumen from t.results;
select '  ❌ ' || msg as fallo from t.results where not ok;
