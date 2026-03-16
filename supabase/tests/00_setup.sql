-- 00_setup.sql — Fixtures communes Phase 1
-- Installe pgTAP et prépare les données de test
-- À inclure via \i ou comme premier fichier dans supabase test db

create extension if not exists pgtap;

-- Les fixtures sont créées dans chaque test file avec BEGIN/ROLLBACK
-- Ce fichier sert uniquement à activer l'extension pgTAP
