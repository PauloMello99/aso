-- Reverse 0012: remove customer-files bucket and its objects.
DELETE FROM storage.objects WHERE bucket_id = 'customer-files';
DELETE FROM storage.buckets WHERE id = 'customer-files';
