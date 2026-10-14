insert into items (id, household_id, title, kind, domain_id, time_mode, due_date, remind_at, remind_member_ids, created_by) values
('11111111-0000-0000-0000-000000000001','5470accf-890a-4677-9923-b2a114c4aa1e','one-time','task','ca168ed8-52c7-47c1-886a-48828e1c3982','scheduled','2026-10-20','2026-10-19 20:00+03',array['81544674-3690-436b-acef-9d7e757cf986']::uuid[],'81544674-3690-436b-acef-9d7e757cf986');
insert into items (id, household_id, title, kind, domain_id, time_mode, due_date, recurrence_rule, remind_at, created_by) values
('11111111-0000-0000-0000-000000000002','5470accf-890a-4677-9923-b2a114c4aa1e','daily','task','ca168ed8-52c7-47c1-886a-48828e1c3982','recurring',current_date+1,'FREQ=DAILY',((current_date+1)+time '08:00') at time zone 'Asia/Jerusalem','81544674-3690-436b-acef-9d7e757cf986');
insert into items (id, household_id, title, kind, domain_id, time_mode, due_date, remind_at, created_by) values
('11111111-0000-0000-0000-000000000003','5470accf-890a-4677-9923-b2a114c4aa1e','sent','task','ca168ed8-52c7-47c1-886a-48828e1c3982','scheduled',current_date,now()-interval '2 hours','81544674-3690-436b-acef-9d7e757cf986'),
('11111111-0000-0000-0000-000000000004','5470accf-890a-4677-9923-b2a114c4aa1e','late-unsent','task','ca168ed8-52c7-47c1-886a-48828e1c3982','scheduled',current_date,now()-interval '5 minutes','81544674-3690-436b-acef-9d7e757cf986');
update items set reminder_sent_at = now()-interval '2 hours' where id='11111111-0000-0000-0000-000000000003';
insert into items (id, household_id, title, kind, domain_id, starts_at, created_by) values
('11111111-0000-0000-0000-000000000005','5470accf-890a-4677-9923-b2a114c4aa1e','future-appt','appointment','ca168ed8-52c7-47c1-886a-48828e1c3982',now()+interval '3 days','81544674-3690-436b-acef-9d7e757cf986'),
('11111111-0000-0000-0000-000000000006','5470accf-890a-4677-9923-b2a114c4aa1e','soon-appt','appointment','ca168ed8-52c7-47c1-886a-48828e1c3982',now()+interval '5 hours','81544674-3690-436b-acef-9d7e757cf986');
update appointment_reminders set sent_at = now() where item_id='11111111-0000-0000-0000-000000000006';
insert into push_subscriptions (household_id, member_id, endpoint, p256dh, auth) values
('5470accf-890a-4677-9923-b2a114c4aa1e','81544674-3690-436b-acef-9d7e757cf986','https://push/a','k','a'),
('5470accf-890a-4677-9923-b2a114c4aa1e','987922dc-14af-4a24-8bed-a6e551e17f37','https://push/b','k','a')
on conflict do nothing;
