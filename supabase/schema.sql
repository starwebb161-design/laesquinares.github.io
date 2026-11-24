-- Pega todo este archivo en Supabase > SQL Editor > New query y dale a Run.

-- 1) Tablas -------------------------------------------------------------

create table if not exists platos (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  descripcion text,
  precio      numeric(8,2) not null check (precio >= 0),
  categoria   text not null default 'Platos fuertes',
  disponible  boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists reservas (
  id        bigint generated always as identity primary key,
  nombre    text not null check (char_length(nombre) between 1 and 100),
  telefono  text not null check (char_length(telefono) between 5 and 30),
  personas  int  not null check (personas between 1 and 20),
  fecha     date not null,
  hora      time not null,
  notas     text check (char_length(notas) <= 500),
  estado    text not null default 'pendiente'
            check (estado in ('pendiente', 'confirmada', 'cancelada')),
  creado_en timestamptz not null default now()
);

create index if not exists reservas_fecha_idx on reservas (fecha, hora);

-- 2) Seguridad (RLS) ----------------------------------------------------
-- Visitantes: ven los platos disponibles y pueden crear reservas.
-- Admin (usuario con sesión iniciada): puede hacer todo.

alter table platos   enable row level security;
alter table reservas enable row level security;

drop policy if exists "publico ve platos disponibles" on platos;
create policy "publico ve platos disponibles"
  on platos for select
  to anon
  using (disponible = true);

drop policy if exists "publico crea reservas" on reservas;
create policy "publico crea reservas"
  on reservas for insert
  to anon
  with check (estado = 'pendiente');

drop policy if exists "admin gestiona platos" on platos;
create policy "admin gestiona platos"
  on platos for all
  to authenticated
  using (true) with check (true);

drop policy if exists "admin gestiona reservas" on reservas;
create policy "admin gestiona reservas"
  on reservas for all
  to authenticated
  using (true) with check (true);

-- IMPORTANTE: como cualquier usuario con sesión es "admin", desactiva el
-- registro público en Authentication > Sign In / Providers > Email
-- (apaga "Allow new users to sign up") y crea tu usuario a mano en
-- Authentication > Users > Add user.

-- 3) Datos de ejemplo (bórralos o cámbialos desde el panel) -------------

insert into platos (nombre, descripcion, precio, categoria) values
  ('Ceviche de corvina',   'Corvina fresca, limón, cebolla morada y ají chombo.', 9.50, 'Entradas'),
  ('Patacones con queso',  'Plátano verde frito con queso blanco rallado.',       5.00, 'Entradas'),
  ('Arroz con pollo',      'Con verduras y un toque de culantro.',                 8.75, 'Platos fuertes'),
  ('Ropa vieja',           'Carne deshilachada en salsa criolla, con arroz y frijoles.', 10.50, 'Platos fuertes'),
  ('Sancocho',             'Gallina, ñame y culantro. Se sirve con arroz blanco.',  7.50, 'Platos fuertes'),
  ('Tres leches',          'Bizcocho húmedo con crema batida.',                    4.50, 'Postres'),
  ('Limonada de coco',     'Preparada al momento.',                                3.00, 'Bebidas'),
  ('Chicha de maracuyá',   'Natural, sin colorantes.',                             2.75, 'Bebidas');
