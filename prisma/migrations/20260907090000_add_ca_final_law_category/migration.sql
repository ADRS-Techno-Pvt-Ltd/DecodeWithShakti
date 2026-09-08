INSERT INTO "Category" ("id", "name", "slug")
VALUES ('answer-category-ca-final-law', 'CA Final — Law', 'ca-final-law')
ON CONFLICT ("slug") DO NOTHING;
