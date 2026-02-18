// Configuração do Supabase
// Substitua os valores abaixo pelas suas credenciais do painel do Supabase
const SUPABASE_URL = 'https://pfzlhjioehglrrrnxbna.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmemxoamlvZWhnbHJycm54Ym5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzEyMjMsImV4cCI6MjA4NzAwNzIyM30.TQi0Mfw4NezwuEHAURNTw8ZtddUBGKkhdAWvGRTJ580';

const { createClient } = supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
