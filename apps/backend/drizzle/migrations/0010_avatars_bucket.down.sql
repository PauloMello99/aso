-- Reverse 0010: remove avatars bucket and its objects.
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';
