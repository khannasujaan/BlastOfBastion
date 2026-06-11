INSERT INTO defense_buildings (building_id, range, damage_per_attack, attack_speed_ms) VALUES
    ('09135b20-9b85-4637-abb8-32fc1d486752', 9, 6,  800),
    ('e70e47e3-0a43-429b-a79a-a1d1a059f5b2', 9, 8,  750),
    ('8c10ff6e-6fdc-4223-a90e-90ebc6bc7ae8', 9, 10, 720),
    ('e08bb5dd-7948-4e89-a546-f0561b4f49b4', 9, 14, 700),
    ('ce5b3980-f847-449d-8c11-e22312474178', 10, 5,  800),
    ('fa490b0e-0b5c-43e9-bbbe-ebffbfa86a79', 10, 7,  750),
    ('1f4b62c0-c710-4c76-943f-a6d2ac67e799', 10, 9,  720),
    ('9baabdb5-9eb9-4b55-9c2c-e0652b5b7674', 10, 13, 700),
    ('385c433f-258d-4e7a-a31e-b86815f98d9d', 11, 20, 200),
    ('b803b5c6-2880-4958-a9f8-6b234b811686', 11, 25, 200);

INSERT INTO resources_gen (building_id, gen_per_hour, storage) VALUES
    ('bd85d5b5-f8cd-4396-aad7-0d8163103c36', 200, 1000),
    ('2f6ecbbc-8020-4e3a-bd39-1fb86dff7050', 400, 2000),
    ('001412f7-85d8-4d2f-a134-b5e9092089ff', 600, 3000),
    ('e296edfc-4432-4d81-9fec-cbd9cc139c78', 800, 5000),
    ('512ef74f-2a4a-4ccc-93ef-e483634154c3', 200, 1000),
    ('9b925805-0fb1-4046-ae1b-79b48c0659de', 400, 2000),
    ('868e6a25-d42c-4791-8d6f-b4cef4667dee', 600, 3000),
    ('2214e1d1-34c6-4757-8cb2-184329b1cfcf', 800, 5000);

INSERT INTO resource_storage (building_id, storage) VALUES
    ('93df0fc7-53d4-4e72-b1ec-aa8de09de1d4', 1500),
    ('606a36e1-6e12-4140-80b3-11af1e5f575c', 3000),
    ('70ae7b0b-cf3c-4f6b-97cd-6deddeed5014', 6000),
    ('0e1c268e-b980-4138-afdf-b04517120c29', 12000),
    ('1a08e5aa-4828-4eb3-b192-9fd4d806a74c', 1500),
    ('323cf75f-c33f-4374-8eb0-dc17466438db', 3000),
    ('df688905-7d6e-4ae7-92b1-e522d145e0e6', 6000),
    ('88940be9-28d9-4fed-b78a-08b54ffd4f68', 12000),
    ('1acb71d4-be48-4e9f-ae6e-90ba7aa4ea81', 20),
    ('cbc23d6b-1728-495b-9d33-0039064c2ddb', 30);