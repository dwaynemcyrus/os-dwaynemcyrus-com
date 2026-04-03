begin;

update public.items
set status = 'backlog'
where type = 'inbox'
  and status = 'processed';

commit;
