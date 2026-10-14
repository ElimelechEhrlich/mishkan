-- Rows that stand for the data before 0034, on a copy of t33 (0001-0033 applied).
-- Repeating tasks of every rhythm, one late for weeks, one with an hour and a reminder, one
-- converted to a note (its rule left hidden), and the times they were done.
insert into items (id, household_id, title, kind, domain_id, time_mode, due_date, due_time, recurrence_rule, created_by) values
('34000000-0000-0000-0000-000000000001','5470accf-890a-4677-9923-b2a114c4aa1e','daily-today','task','ca168ed8-52c7-47c1-886a-48828e1c3982','recurring',current_date,null,'FREQ=DAILY','81544674-3690-436b-acef-9d7e757cf986'),
('34000000-0000-0000-0000-000000000002','5470accf-890a-4677-9923-b2a114c4aa1e','weekly-late','task','ca168ed8-52c7-47c1-886a-48828e1c3982','recurring',current_date-23,null,'FREQ=WEEKLY','81544674-3690-436b-acef-9d7e757cf986'),
('34000000-0000-0000-0000-000000000003','5470accf-890a-4677-9923-b2a114c4aa1e','monthly-31','task','ca168ed8-52c7-47c1-886a-48828e1c3982','recurring','2026-10-31',null,'FREQ=MONTHLY','81544674-3690-436b-acef-9d7e757cf986'),
('34000000-0000-0000-0000-000000000004','5470accf-890a-4677-9923-b2a114c4aa1e','daily-hour','task','ca168ed8-52c7-47c1-886a-48828e1c3982','recurring',current_date+1,'08:00','FREQ=DAILY','81544674-3690-436b-acef-9d7e757cf986'),
('34000000-0000-0000-0000-000000000005','5470accf-890a-4677-9923-b2a114c4aa1e','was-repeating-note','note','ca168ed8-52c7-47c1-886a-48828e1c3982',null,null,null,'FREQ=WEEKLY','81544674-3690-436b-acef-9d7e757cf986'),
('34000000-0000-0000-0000-000000000006','5470accf-890a-4677-9923-b2a114c4aa1e','plain-task','task','ca168ed8-52c7-47c1-886a-48828e1c3982','scheduled',current_date+3,null,null,'81544674-3690-436b-acef-9d7e757cf986');
insert into completions (item_id, completed_by, completed_at) values
('34000000-0000-0000-0000-000000000001','81544674-3690-436b-acef-9d7e757cf986',now()-interval '1 day'),
('34000000-0000-0000-0000-000000000001','987922dc-14af-4a24-8bed-a6e551e17f37',now()-interval '2 days'),
('34000000-0000-0000-0000-000000000002','81544674-3690-436b-acef-9d7e757cf986',now()-interval '30 days');
insert into item_reminders (item_id, rule, minutes_before) values ('34000000-0000-0000-0000-000000000004','before',15);
