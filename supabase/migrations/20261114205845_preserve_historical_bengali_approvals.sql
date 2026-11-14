-- Historical approval compatibility, September 2026 cohort.
-- This is an explicitly scoped owner attestation, NOT a fabricated new review.
-- Generated exclusively from the existing 100 production published translation records.
-- Any update to translated copy, canonical identity or tracked source data revokes this exception.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '25s';

CREATE TABLE IF NOT EXISTS translation_private.legacy_item_approvals (
  translation_id uuid PRIMARY KEY REFERENCES public.item_translations(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  cohort_label text NOT NULL DEFAULT '2026-09-15 owner-attested legacy publication',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE translation_private.legacy_item_approvals FROM PUBLIC, anon, authenticated, service_role;

CREATE TEMP TABLE legacy_bengali_manifest (
  translation_id uuid PRIMARY KEY,
  item_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  fingerprint text NOT NULL
) ON COMMIT DROP;

-- Exact historical 100-row batch: identifiers and SHA256 fingerprints only, no copied descriptions.
INSERT INTO legacy_bengali_manifest(translation_id,item_id,tenant_id,fingerprint) VALUES
  ('01a90101-ab72-43a6-a228-0cd8bc5d8963'::uuid, '3448ed8a-9c0b-49ab-b249-f096fbc210c7'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '77428eeaf3d5056e438b7922cd10ff24273dad60c29efacea59ae5f353a35a29'),
  ('03b260c0-693e-4cb1-9e57-9cf15ce0e345'::uuid, '36d0b0c2-7cb2-4b27-8317-24b9e4842814'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '08e44c38333ed0831ec5b11104e9af0b3d6001d7e522e4879c90a07e8bd67c68'),
  ('04ffda00-d905-4365-8910-22c48291655f'::uuid, '30559d5c-638d-421a-adf5-8f9929db2c3f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'deb218cfe8599e3e71940de05c76b5170b76b2b6f9232f3f017a71478db3e45c'),
  ('05d22a4c-d8cd-4e1f-86dc-99f4a6f9e7ce'::uuid, 'a264e644-4f12-4f2d-95fd-2eb9c6ff3eb0'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '1efbdc2aeba20b3283b6514b7d27353a3b5e7f3b5b978cd8665d58e0ce5519bd'),
  ('0c7f8fde-e81a-4df1-8c50-8586cf319312'::uuid, 'a73e0ab5-00e9-4a1c-b8fa-e74a23d4814d'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'cd495e34c6fc597e83902eb529e39ce8a613e05aabf25e886fcf41cf5312965d'),
  ('101fbf7a-752e-4833-8eba-a602d3df1b0d'::uuid, '5f7bf5ac-0fef-404f-80c8-2e6caee90e0d'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '8bbadf987f28663acbe13273ed8a3a27a9c4f047ba03af4e39286ce8747ec509'),
  ('10e97e13-84b8-490e-af91-09ce018b3a38'::uuid, '2fd8270d-63ea-4c6e-965c-3673f83b305e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '6c2508cfa5134f92fbe232e73192a9dce2543904ff5a2e9abab595fc7da22ed8'),
  ('15399b42-2684-483e-8ba5-07661ab98348'::uuid, 'a3f0d8a1-38f0-4c04-b2fc-e83f930dce35'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '64ae85955d9cfca1a0aaa24f249c85456000964797b7a492acaa9f1cab48c906'),
  ('15c9372c-933f-4650-a0ab-f31e84b0a53f'::uuid, 'e04a2efd-9a26-411a-9984-eaf227f72cdc'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aad96e308823985b6a60ee66a8b58c051627d0f7888e01601a0111eb2f1026d1'),
  ('18add02c-6cfd-4c62-8e12-117c3f770901'::uuid, '13b4aa6f-d23d-4b84-a400-1743350c08b4'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '11caf8be7c3eee00d604117ae18bd8c862b5fb4d0f90f58be2b52d0373dc529c'),
  ('199c8042-3d39-47cf-aa28-c4ada02da940'::uuid, '43d35e6b-2764-42eb-9d2c-9a6b75a26d75'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '5a5305c192539c9845f2f03565a7d8d3d712caf892971216fae0b3cb9d909770'),
  ('19de352d-2ceb-4dfe-9aee-6d39cf627ef9'::uuid, '7f83c14e-0e3f-4ffa-bac2-14723131c257'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'eb5b1e54ffca1f837a7e8295b60fdfeceff6bc1f9b53a7304ff3e0c0c9a0eab0'),
  ('1a198f54-6929-4cc9-b9eb-85771822e66f'::uuid, 'ac215b8e-3ff6-4210-89b2-56f0835fe66d'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '63b3d03a119e1eff5a236572efcc894fc92f3de4b518499582b74377658aace4'),
  ('1c7f673f-4182-4c90-87fb-cbd36845764e'::uuid, 'ce560b3f-07bc-4b18-9469-915f01cc72c7'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '342c70cb5d833bb241d6eb8aa6e1a406b82ccc672ed4a402bf87c9da5a604e52'),
  ('1ce03bea-8305-4ad2-a9ac-1398cc55bcba'::uuid, 'd795a5c1-76c3-4c12-aef2-cc37fbfed256'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '4dcdb0a8b88c19bb9f60b19195e0a32e817fb76acd56f70684f114810820331c'),
  ('1e234ce9-4e0c-4d35-9d9c-5d4c62590bf1'::uuid, '996c03c9-e79f-4720-bde7-7ccb5364dfa5'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '7cee730edd97ab73cd17cd6d97651e2f1966fbec523ecaab689d21aec5b75c74'),
  ('239ad3e3-6d7f-44c6-a5e2-ca183e0b2d0d'::uuid, 'de52edb0-861b-435d-9b7f-ea898b25a112'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'cdefa44579112667ce88665e6ebe728482781f94412cf4fc959dabb49bacc4de'),
  ('2a3869ce-0207-4ce4-a8aa-02fd87d6d4fa'::uuid, 'e489f2a6-100b-46fc-a010-a3f08557a1a9'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aad5759eff6b0d302896e00063511665e64e9dbd0d84895b505bde6dcc081435'),
  ('2af9171b-3d32-4c41-b483-339d7cd5156f'::uuid, '0c815bf1-c506-44f5-88dd-b504db60d7af'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '68dde6fa1a7e1bda85372ec24f3f0bc381f33de15eeef0194d244dc9fb0331dd'),
  ('2be55d2f-22ba-4aa6-9dc1-2b781560cb7c'::uuid, 'c2954038-a028-46bd-99ee-ebad09f8e939'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd4f54e6676863b6cc7c3a774385c5239a9b50667bcb0d3e75e1ac6479cc1c503'),
  ('3c125f51-ba76-43b2-bad1-83906c11507a'::uuid, '01edf1e7-818f-492d-a7c7-c08bd93dda2b'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '92b43ba2b396c8c87462fbfe5c857bf9746ed59f40fb14500e03e9ea5441adda'),
  ('3da0afae-1c59-43e7-b15d-2195f545098c'::uuid, 'dff50278-b007-4e5e-a8fa-11dd93a23675'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '8fff35daff7cc1231db782bd53cf614ee447ce79bdfa20c949b6ef498e3a7844'),
  ('44b0373b-2f6c-4b5e-beae-8f901940275b'::uuid, 'd2edf551-65b6-4c3b-a034-7ae486761d04'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '011a9ed446543962156896728e3e77e58ede60126c5ff01ce83172005eb128fb'),
  ('47d80d28-1dc3-4a3d-8c6d-31c0f6679891'::uuid, '3ff58ec3-01fd-454d-9344-329f2edf1e7e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd190f48d4132008d07a76f2477a9997eaa6c2c6edfce4c4abfb723159a709a54'),
  ('4a372498-5fcc-41ed-81f0-4549da82ed0d'::uuid, '279dd4c5-edb0-4365-9ac6-d5cb0729a4f7'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ad5d1f5d12bc75ab52890c2a8ff18594f3dd682ed00ea7d4aef9ef23ea937786'),
  ('4a4bcb07-9009-42e6-90d2-d26c381fd9b9'::uuid, '31646279-ba1c-4755-ac78-1e09ab6b8b63'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '72934cdcdc16170be21372490ac33e7cf0e71e2398aadf5c9fbc31f617da3ebe'),
  ('4b16c30d-f942-4ced-bfc5-2e59ec2766a1'::uuid, '2cc1c0bf-d2c0-47d6-9e90-e8d4df02a666'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '04196e072951fab58ae50e62c2cc9cf5258c3b8f9badb9f72913c4eb0602a6c3'),
  ('4bbfc323-92d6-41bb-9294-360f9fba55a1'::uuid, '9da28496-dc50-40e4-914d-3b0860f7466a'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '6e946172b3a59528e65bdff99f9f2b3f609401bdb69862f51d732e12fd0471c5'),
  ('5003002d-4a3c-4753-9c14-71afa7a44eee'::uuid, 'e713300d-1352-473d-aae8-7a0eecca4e26'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '3f777e915f3f9d9fea57581b3e9283d972a4763c45fa9af991765f06a3a7486f'),
  ('51f5f292-42b9-4cde-8c8a-bbf9d2ea3856'::uuid, '37c4d144-19d6-4792-a471-0553481e71df'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'dac3da6b6fec24ff2ebad914a6d95d3ec34f1c50fecf0c3ee56d9b1eaf144178'),
  ('51f90c67-b09c-43f1-8a97-c11cca8b1b74'::uuid, '4fa3ff74-fd5e-435a-a5b4-bd4968018c0c'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '28513d991fd24069e2c07591696f270cbe0a01d3f72604d56c6805b4b193ee43'),
  ('560b489c-a900-4ac4-9e39-0fcf2595f470'::uuid, '84c251ea-7942-4131-8048-2a8bc68ea76a'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '8cc4aac02679dd09a462ee76786da1e8ecdf51070d5c37fa56a2abf6a2dc6932'),
  ('57b2dd43-044a-40a0-a96c-353e79a840e9'::uuid, 'c1c42ee6-7bad-4306-a7f6-546208d97862'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '523779ff9fe2e4ac4a57e6b8d185fe5aa51ac1239791fb5633ecbc3b362d3f60'),
  ('5b000fb3-05fe-4aa8-b71a-444c70c4385e'::uuid, '344b2fe8-9de3-4338-874d-d29c679bec66'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'f094d1f6429272df821019817749b90cc0dfc5f80d34e3b50caf337053f2b06a'),
  ('5b875eee-c5fb-48ad-b5ec-50574272a4ef'::uuid, 'a7c99172-d494-486d-8897-58bcbbe71750'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '4e93c2cbd46a0759a0e91ecde1b93b5168af94c5fa45dd7b117e34fa82977c49'),
  ('5f020b83-2c54-4b34-9417-a531f8e519e8'::uuid, '68a10007-7e01-4bed-b0de-89c4720392b6'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd6220493bba2483aad53e860cbd8c090eb12186b5110b87e6377f22489785fc4'),
  ('65c7596e-024a-412e-b30d-3ae399d84f21'::uuid, '4bbb76d4-f058-430f-9fd1-87db15d71b5c'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'cf47da0880f7a860e5da5c15a481582d3b808f3af9560e5f7282523910893b47'),
  ('67673888-5175-46df-9ad6-eeee76855a2b'::uuid, '444bc290-5d07-45bf-93ab-03b68554cc32'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ac8c153996ac1148e36ea377fc9151034ea3ce566c5f384aefe8f00852990068'),
  ('67f80976-4b65-4ecb-9c68-f2545afd25f2'::uuid, '1e21b135-feaf-400a-8be8-a92deb3150e3'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ab6adad21a4fffc1f2b9d229c5f1ebe4e28cc74eded6faf016df3d53573d892d'),
  ('6b7cd587-5ff0-4792-b930-8b90e4b6e3d2'::uuid, 'a3532e8f-0c4e-4edf-b43c-3aa9e9ad4aaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'f25864a5f5ac398fb06e4fc3266da10aea69a3cdcc97425568bb19107407cc58'),
  ('6e156ad2-a088-42e2-9a39-399680ae36cb'::uuid, 'a1f582a3-96fc-47a7-ae62-b3117b537773'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'c666b86bbfcf7f9aa589084320eb77c9d927719fea0a74c67245161040e8d6aa'),
  ('6ec15023-56b5-45d7-ae92-86b2caf560c6'::uuid, '35c65247-aba4-4d06-861c-1f61fa450e76'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd402861c552f4837a84cff0d973b6c8ce535d55a6c8ea26ef0f405d1bf244ab8'),
  ('70d3c8c6-7a70-4bfb-80ef-a1dc851807b6'::uuid, '3d7c76cf-0b13-423e-be2f-c472982f6cfd'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b790816cf671a1b7c28073c740a49733435646a334d4dfb24be9ab47cd19b4c6'),
  ('72adddf0-09c5-4b78-a6f9-320aa7dbca8d'::uuid, '95c86e99-34c8-4ed3-823d-2ca8446fdbd9'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b66f901c9d02059dc8959fa52c8e817f268382e39c3f3cd6446623379e6d6854'),
  ('754a183d-cb05-47b0-a590-91fc9d192861'::uuid, 'b19d0292-620d-40f5-9f14-b9f9d5933305'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '4ee8e3e15a96f7ced3d19154940dce3977e0683febc57b6f53fd2bdebdc0a6f2'),
  ('76c448b5-8b7e-4bde-ac81-4bdf48f14475'::uuid, '645a0b19-227e-495c-8f7a-0d1a6f869b1e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a8a90fd4345e6d34cca85477532337bf99a5642a312c33a0f1dbb663e3f111dd'),
  ('7ede2bf5-7804-42f6-91fe-6d20397f8ff0'::uuid, '2beb6159-4f20-4d34-9a08-a15020ecf4c9'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '9897b4dca572cc08a781a454bdfe3f3439d5695ce96cbdf1763212e50185c187'),
  ('8144caca-2191-40ee-81e1-db198e50c67e'::uuid, '454c2304-e8b0-438f-9782-7fe677c2d490'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '326c6a4a7b1eb24b3951d6817c1304b849372633d7e3b71bfa7893fe2b68c295'),
  ('81657d7b-e021-4840-8876-400bc812ef59'::uuid, '8169739f-dd49-4588-928e-837a22faa388'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '9ba365b8290593f8ca75f286bceac608b7226eb514d6a962ee5946ee11648513'),
  ('821964b3-0357-443f-974e-ff8a358ddec7'::uuid, 'ca9bad3d-d209-42b4-93b9-465705f89e5c'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '25072fed86ddb96b41bcb5316b0e732fcdd03d49b1d5adc96a94c3a2d476b36f'),
  ('822eaee8-80fb-4a67-99f6-a7a105f16bef'::uuid, '5fcabfea-eaa1-4a13-a493-3d0051255216'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd28432b6d1992d1c5bc8ef3c9bde5a7ba541fe831c07a44f62ac79df7692c7bc'),
  ('8525e65f-2422-49fb-b084-a115dbc7b909'::uuid, 'e02fc3c1-fb88-4c8c-8368-9e2ee3b17971'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '851c7eee5a33accf81021526692d0f2a4acc24239d083bf1327ed69b700d8747'),
  ('85906b95-1e52-45dc-ad4c-a134a079bfee'::uuid, '2326e34f-8852-4c53-9b56-2111af41aca9'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '1f6c65d68428c6e5b04f3b453fb52b1f3d70efe3ad61842ce9bfc981cb8ddd3c'),
  ('86c20ee8-553d-4f0e-85bb-d5b3486622de'::uuid, '97ddf2fe-adb4-470e-bd72-16d5eea025ae'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'f8720b02b529fe721bd35b609575d6e7adc3cc9721ba27bebc7a64143b7e26c9'),
  ('89fab344-a7f9-4371-9d32-b9fc44f5f173'::uuid, '1bc11b33-6a19-4245-8ef1-261179725a21'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '9f151616472a666c70a4dc57dc3e15c6bc17f6a5d7cb23a3bc920ccd9ab7d84e'),
  ('8bab66e1-8719-41d1-94bc-1d166ed588de'::uuid, '896fe7cd-638a-4bd9-b1c0-29261de51c68'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '1beecfd33ac36225ee37b58cddcbb3675044c268d1a5420f9afd2e84ff5634ab'),
  ('8c4be143-ba5f-4dd5-bd94-40edeceeede0'::uuid, '4d20b020-9cd3-4e9d-bada-df2b1fd9e839'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '6b6db3219f98da2c7009ed66319253257682f3eeac3bdf7d36a43fdcdd9d6335'),
  ('92044c6d-4890-4d5b-aaf0-ca556293d8de'::uuid, '685b9d11-a04a-4ef4-8753-712b21fdb75b'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd705b2a436808a386febef1aa03b2176882d31225384fab993e14dac6f0e80ea'),
  ('9269e22e-e9c6-47e8-a4a5-4bdd9c871cfe'::uuid, '171dec14-87ca-412d-b37e-183e0dd79add'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ba278806d9200ce8e93133c84cb25c1c2630511f75bd51cf8d9bedc6c60645e0'),
  ('93b55835-28de-45dc-bedf-0b393be4878f'::uuid, '7fd83cfc-2eac-45d1-aa90-0002ca5a0222'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '227186fb0ebe363c431b8be2ef4c7333ccc81e7d636e377de8b9b847fcb2cc2e'),
  ('95445d2d-58da-4edd-868f-c83f53668810'::uuid, '4b9f85fa-71bd-416f-9b34-8d4cf9c84635'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0e09df8b651f97ea3676b1cfb165846b6ca827f1d0b9695a62e59953c1be4e13'),
  ('969f63c5-41b1-4347-b596-6fded3ad5146'::uuid, '255c2229-0c22-4661-af06-3b45ee21393e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b7d350bef8733fd3281452289c3c36157b61d3f409723053d7b8826fcd0dcbb8'),
  ('97dc12d2-36cc-4e0f-baeb-d04548fcd606'::uuid, '5548de27-27a6-43c0-b280-210918fb4326'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '11455499f36c100ef40134c526fd76c5862ed41b6a3b404a5582f1734a1540d6'),
  ('982d5c8d-a8d1-42b3-999d-58ae047e07e1'::uuid, '41d82818-c419-48dc-bece-75176b093186'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'cb23e0be272f8385b262701306bc7aa79937b8493ddea964f29fb40828cccfa5'),
  ('9e1ed7e0-5768-4e5f-8e73-92a10868b883'::uuid, 'f49fa080-07f8-4ec3-926a-6f64e315802f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '14a450659918ca8c0dcf99e81e4de137dd5c5a122e783be8f75c384359e58ce9'),
  ('a016b0dd-ef18-4f90-8fc0-19d236da2222'::uuid, '3d72a47b-ff8e-44fa-9589-6c6c7b5eb88c'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '9da56de198fe4a0f3506355200e7be65795a2a315273f36223df20c7c233404b'),
  ('a33149b8-66b9-4248-8b5a-748b7ef600d3'::uuid, '0d968da5-eb17-4900-a6bf-19e7f627069d'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '60cfacf97674b535c0e2aa14e54c1527404382835eab80fadb187ca21bbda0f9'),
  ('a6ca1f2e-2e7d-4d28-99cf-5ac2712f166f'::uuid, '970ac032-6ed3-40e2-adc7-188b45aed98f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0455e95a16b31b66ebd2ab457702a1875a417ec6ffe54f5f5fc3adec0e25e17a'),
  ('a742c1d9-21a8-4f20-99b0-1ba101fe397b'::uuid, '315a1ef1-49ef-470e-a0ff-818aa0400739'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'f2b58486201caada9ae291639c772a28a63b707980f260a7d75154aa76c92268'),
  ('a8bbaf0d-8f14-4690-9225-b085ceda679d'::uuid, '70cd1163-32c8-47f9-a2e0-b62b57865827'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd07b089998444ce981bb119becb6e39dd36e66788831bed6b5ca1da5ddfa620e'),
  ('a8cfbd88-4621-46e1-9c57-d707e5768cc3'::uuid, 'e63501ef-fdef-487e-8267-051dd5906efa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '8da06aa3ff9b80c11bf7cc4915cedc6e87819b19a02cac7e154e588da8f64f18'),
  ('aa181653-14b0-4043-9338-ed2405ac7f9b'::uuid, '8f221a68-ae53-49ac-957a-f7431171a7c0'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '9d4aa20f63a60c39a1bd3fcb594960b00d07a77ae704ce0a6afd2f7dff3bb9fa'),
  ('ad94ddcc-9c50-4492-9bd0-b41240e7eb4b'::uuid, '6cc6a653-0e68-4792-9cad-0cd45ecfef00'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'd9ad800d759d3bb57d7a3656abbea06bc5990e6c785bb8129f718cf0f315cfa0'),
  ('b1eba588-9665-4947-a2ee-74bb5a101f8a'::uuid, '8b855997-21c8-422e-8415-261606d40284'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b46f5a53070e698aa8bd9255ffcd85f76d4be13719d8ae79ac95b252a4923b43'),
  ('b36c9a44-0cd3-4ad2-bf25-6530f634d955'::uuid, 'ca3a462d-3327-4cd3-867e-1ccf2d992b8f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0c6d61e02a857fe99e0a50f2c5deecdff3de8ce38c21c90c24a967cc2640d582'),
  ('b8796fb1-2762-4c31-a1cb-8f62ffc72d32'::uuid, '4072b5b2-04a4-410d-8541-137dd82243d1'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00835bb1a9770288589d1e6afaa6741ccc1112d46119ef6f88aebf3cb5d60f95'),
  ('b969b66d-c746-4bc5-88b1-ddba55bc7652'::uuid, '841b013d-e7bd-46a6-9e69-282f84aa2781'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '648ac9cf551447ccaaa83fb97effa9e2eeffdd129418f8da7bd15b4f1f1a3c42'),
  ('c01d3bf5-0ec7-4ffa-af1e-57a40c1c58b9'::uuid, '119ebe7e-50c8-4916-9a38-8bccfebde485'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b3a01a4b8846647d630412f0aedfa25baee0ff118462059ffe6c225c94251bd8'),
  ('c121c025-7499-4c28-b8aa-ed213685de68'::uuid, '2ebcbd41-fe91-4277-8a5e-054e13e34e1e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '103760f8857acfd6adfc42c821e0570ad3c2d1736737c810924900248d5ee4de'),
  ('ca9ef481-2723-4a19-8acd-f9e3f39771b7'::uuid, 'bc7db269-4df6-47cd-933a-2404d446ee7b'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '292b8ebd73c4cf5b0e108c026e47f6d83ea24d0aa72e624d5e9b5120b24befce'),
  ('cbb5dfd7-48b8-439a-a0e0-8ba832ac5b84'::uuid, 'c91b3c32-6fb2-4cb8-9fa7-e102965a9f95'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '074bc28d2a47cb5398d39a65896013ba734643b22f8a8619a3819215e41049ad'),
  ('cd463ece-26a2-48b1-828d-280f46a4e137'::uuid, '9aaf571a-69a2-4dbf-8bf5-a253f93eaf5a'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'db70ee0902a251670bc108d682813fd3ff3c67687475ae4dca3f39a4ab2276ce'),
  ('ce882683-81f7-42cf-bd5e-dfa2a3a445e5'::uuid, '6556d8e2-ab67-44cf-a0aa-e4c614824531'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '7b2415b289294fd098ace4281f7482c6b16611660d47631f68d4fcc1c9a381fa'),
  ('ceb20835-c3e7-4170-a6f8-a29e7904652c'::uuid, '8802ba38-3a89-41c6-96b0-a0ebeb62d9ce'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '2cead9833437e367fe99330284fc081d43572d2916b4a4dba0b2597bde362efb'),
  ('d06edcd6-3926-4e73-abfa-00912f854434'::uuid, '8acb5ba5-b086-4ba4-9ebd-19c1997b1ea2'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '502294fe6aa79f25494feb19f84b168684a56b23b06c6849fd5a4f6110d46dec'),
  ('d0d46440-2528-484d-a2d6-2ff707142f5b'::uuid, 'b79a6606-3eb8-425e-bf53-57c5788dc7ea'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '6923089a3f4fbc0fce56ffa91de79fc37a9a1e8149d448009e25933fba93ebb6'),
  ('d3b74586-1b37-411c-a243-a2e852706a73'::uuid, '622f5405-bb9c-464b-8f7d-56b8838586a0'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '610c41a8f689ad66664f779016497bf81334de907fac76c05c8c333403e743a1'),
  ('d9029acc-8e51-46e2-894f-9722994e86fe'::uuid, 'b1a686a7-9f23-47bf-8d78-925af6888271'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0c662cef31ea9183361932ff78652fe01e09f65f02fdcab2787834d5b0b6bf00'),
  ('dc11df48-a172-404a-b9ac-c30431b20ff4'::uuid, 'a0e370df-8e43-4368-ac84-b083b96cce2f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'c52f8500ab9454d2a0b723c69dc0ed43ba9a05d59ccf1956257079bbc0bdc126'),
  ('dec24aa2-0035-4e13-be48-d3ba708754f7'::uuid, '1a1789e5-3103-4bd0-a7b8-9cc72754152a'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '414076ace97f2bd07bad8461cf1dfb58b9ed01c7c7081cdd03c4026565a0ed18'),
  ('e39a5114-ab88-4f65-8016-e93140c30a61'::uuid, '4eae3dff-5f07-45d9-8c3a-0acd66850061'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'e627971dfdbf4e2190b33f350c5fbc32b21ac3b062140c7cbdd58420479b7570'),
  ('e60aa264-8596-4370-9a9b-5762938ef14e'::uuid, '5d15bf02-ed02-4187-8b62-bca3f235f54f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a93d5ddb671583e7e7ac28c554fb049aaa34b7cb8b82f64a00d02b6ff69ed75b'),
  ('e8a0cdc9-432b-4835-b07c-80e92e8c143b'::uuid, 'ac68b2c3-ae76-48e5-8a9a-60d836a92b40'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0a307d2f8577a84a6ddfc284126e0fea36605abacc9212561949cad3dc713826'),
  ('ec886cad-693b-49f4-80ed-a4e96cd6a87f'::uuid, '16eece31-f416-4db2-9c0c-371d2696a917'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '90a77c1fe7e0605dbecbecfaa9d27e43e6989927283544f70eb9791a7acf67a0'),
  ('f0623683-a220-4593-aac0-8c9d77edaa0f'::uuid, 'c9296295-c7b3-4e3d-8d3b-bc940de8438f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '1286a02fc99a73dde35a7d8b9bace3b2b2aeb45172afba7ea912a326326b7c04'),
  ('f104cf12-1b99-495b-8a58-995174d5847c'::uuid, '64a50d78-5de7-4b87-a7a1-ce1cda556ee0'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '313f106446b3f0c646740855fb3d144c964836ab862542a748747d4f2bda9de4'),
  ('f3b786c3-af6e-4de9-bde0-2ee80cbcee80'::uuid, 'e4aa82b7-db5f-4f75-85e2-f7080dd7ad8d'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '2176f45a514fc5bb681a8fa82137d1166b6e507204b2c550b9b6a9a429d198dc'),
  ('fbf93df3-e294-4ec2-9caa-e2759de125b1'::uuid, 'fd1ecb57-3e02-4353-a51f-ff829d15ec9f'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '0f170b0142ee6d9f2cd6d8cc9af2aa06a1b96a088ec4de1815b7974f44d62ca3'),
  ('fe504475-75b3-464c-8bfa-9da9af4132e2'::uuid, 'a93e393a-801d-4515-99ac-49feb0a3ed74'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '62e5df0a81995a4f351e485f1970bc5010f740d273fb18bfc8b257e26bc9e8c0'),
  ('feebac7c-55fb-4e72-bd22-48ba36cb1887'::uuid, '9dda25e9-876a-46e6-8406-d78b82c0b60e'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '4243ae4dc393f450e175a9740673bb6f8baefda4d7235c67826b3a1de67542f4');

-- Fail closed: a nonempty target cohort must match all 100 original rows and all checksums.
-- A fresh isolated Testing project has none of these original translation IDs; it can
-- install the compatibility logic with zero manifest rows for synthetic regression tests.
DO $guard$
DECLARE
  v_present integer;
  v_valid integer;
BEGIN
  IF (SELECT count(*) FROM legacy_bengali_manifest) <> 100 THEN
    RAISE EXCEPTION 'Historical Bengali manifest is incomplete';
  END IF;
  SELECT count(*) INTO v_present
  FROM legacy_bengali_manifest m JOIN public.item_translations t ON t.id=m.translation_id;
  IF v_present NOT IN (0, 100) THEN
    RAISE EXCEPTION 'Historical Bengali cohort is only partially present: %', v_present;
  END IF;
  SELECT count(*) INTO v_valid
  FROM legacy_bengali_manifest m
  JOIN public.item_translations t ON t.id=m.translation_id
  JOIN public.items i ON i.id=t.item_id
  WHERE t.item_id=m.item_id AND t.tenant_id=m.tenant_id
    AND t.review_status='published' AND t.locale='bn'
    AND t.created_at >= '2026-09-15T22:15:37+00'::timestamptz
    AND t.created_at < '2026-09-15T22:44:00+00'::timestamptz
    AND t.updated_at='2026-09-15T22:45:42.080468+00'::timestamptz
    AND t.evidence_snapshot IS NULL AND t.reviewed_by IS NULL
    AND t.reviewed_at IS NULL AND t.published_by IS NULL AND t.published_at IS NULL
    AND m.fingerprint=encode(sha256(convert_to(jsonb_build_array(
      t.id,t.item_id,t.tenant_id,t.locale,t.name,t.description,t.search_terms,
      t.review_status,t.created_at AT TIME ZONE 'UTC',t.updated_at AT TIME ZONE 'UTC',
      t.origin,t.last_verified_at,t.details,i.name,i.description,i.sku,i.barcode,i.brand
    )::text,'UTF8')),'hex');
  IF v_valid <> v_present THEN
    RAISE EXCEPTION 'Historical Bengali cohort failed identity, timestamp or content fingerprint checks: % / %', v_valid,v_present;
  END IF;
END;
$guard$;

INSERT INTO translation_private.legacy_item_approvals(translation_id,item_id,tenant_id,fingerprint)
SELECT m.translation_id,m.item_id,m.tenant_id,m.fingerprint
FROM legacy_bengali_manifest m
JOIN public.item_translations t ON t.id=m.translation_id
ON CONFLICT(translation_id) DO NOTHING;

-- Exact, read-only eligibility probe. The private table has no client table privileges.
CREATE OR REPLACE FUNCTION translation_private.is_legacy_item_publication_eligible(
  p_translation_id uuid, p_item_id uuid, p_tenant_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM translation_private.legacy_item_approvals l
    JOIN public.item_translations t ON t.id=l.translation_id
    JOIN public.items i ON i.id=t.item_id
    WHERE l.translation_id=p_translation_id AND l.item_id=p_item_id AND l.tenant_id=p_tenant_id
      AND t.id=p_translation_id AND t.item_id=p_item_id AND t.tenant_id=p_tenant_id
      AND i.tenant_id=p_tenant_id AND i.is_active IS TRUE
      AND t.locale='bn' AND t.review_status='published'
      AND t.evidence_snapshot IS NULL AND t.reviewed_by IS NULL AND t.reviewed_at IS NULL
      AND t.published_by IS NULL AND t.published_at IS NULL
      AND translation_private.is_product_details(t.details)
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.tenant_id=p_tenant_id AND s.metadata @> '{"is_public_storefront":true}'::jsonb
      )
      AND l.fingerprint=encode(sha256(convert_to(jsonb_build_array(
        t.id,t.item_id,t.tenant_id,t.locale,t.name,t.description,t.search_terms,
        t.review_status,t.created_at AT TIME ZONE 'UTC',t.updated_at AT TIME ZONE 'UTC',
        t.origin,t.last_verified_at,t.details,i.name,i.description,i.sku,i.barcode,i.brand
      )::text,'UTF8')),'hex')
  );
$fn$;
REVOKE ALL ON FUNCTION translation_private.is_legacy_item_publication_eligible(uuid,uuid,uuid) FROM PUBLIC, authenticated, service_role;
GRANT EXECUTE ON FUNCTION translation_private.is_legacy_item_publication_eligible(uuid,uuid,uuid) TO anon;

-- Preserve strict eligibility for newly reviewed publications; add a narrow immutable
-- compatibility exception only for original historical item IDs and content.
DROP POLICY IF EXISTS item_translations_public_published ON public.item_translations;
CREATE POLICY item_translations_public_published ON public.item_translations FOR SELECT TO anon USING (
  translation_private.is_product_details(details) AND (
    translation_private.is_publication_eligible('item',item_id,tenant_id,review_status,evidence_snapshot,reviewed_by,reviewed_at,published_by,published_at)
    OR translation_private.is_legacy_item_publication_eligible(id,item_id,tenant_id)
  )
);
COMMIT;

-- SECURITY DEFINER mobile catalog must match public RLS, including the exact legacy cohort.
-- Keep security-definer mobile search aligned with the public translation eligibility gate.
-- Mobile catalog v1 applies the existing mobile filters and pagination in
-- PostgreSQL, returning only the requested page plus its exact total.
CREATE OR REPLACE FUNCTION public.search_storefront_mobile_catalog_v1(
  p_store_id       uuid,
  p_query          text    DEFAULT '',
  p_category_ids   uuid[]  DEFAULT NULL,
  p_in_stock_only  boolean DEFAULT false,
  p_sort           text    DEFAULT 'best',
  p_limit          integer DEFAULT 20,
  p_offset         integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  v_tenant_id uuid;
  v_is_public boolean;
  v_query text := btrim(COALESCE(p_query, ''));
  v_sort text := CASE
    WHEN p_sort IN ('price-asc', 'price-desc', 'name-asc') THEN p_sort
    ELSE 'best'
  END;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 60);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF v_offset > 100000 THEN
    RAISE EXCEPTION 'Mobile catalog offset must not exceed 100000';
  END IF;
  IF COALESCE(cardinality(p_category_ids), 0) > 200 THEN
    RAISE EXCEPTION 'Too many category IDs for mobile catalog search';
  END IF;

  SELECT s.tenant_id, COALESCE((s.metadata->>'is_public_storefront')::boolean, false)
    INTO v_tenant_id, v_is_public
  FROM public.stores AS s
  WHERE s.id = p_store_id;

  IF v_tenant_id IS NULL OR v_is_public IS NOT TRUE THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'total', 0);
  END IF;

  RETURN (
    WITH matching_items AS MATERIALIZED (
      SELECT
        i.id,
        i.name,
        i.price,
        GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        )::integer AS sellable_qty
      FROM public.items AS i
      LEFT JOIN public.stock_levels AS sl
        ON sl.item_id = i.id
       AND sl.store_id = p_store_id
       AND sl.tenant_id = v_tenant_id
      LEFT JOIN public.item_translations AS tr
        ON tr.item_id = i.id
       AND tr.tenant_id = v_tenant_id
       AND tr.locale = 'bn'
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
       )
       AND translation_private.is_product_details(tr.details)
      WHERE i.tenant_id = v_tenant_id
        AND i.is_active IS TRUE
        AND (p_category_ids IS NULL OR i.category_id = ANY(p_category_ids))
        AND (NOT COALESCE(p_in_stock_only, false) OR GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        ) > 0)
        AND (
          v_query = ''
          OR position(lower(v_query) IN lower(COALESCE(i.name, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(i.description, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(tr.name, ''))) > 0
          OR position(lower(v_query) IN lower(COALESCE(tr.description, ''))) > 0
        )
    ),
    total_count AS (
      SELECT count(*)::integer AS total FROM matching_items
    ),
    page_ids AS (
      SELECT m.id,
        row_number() OVER (
          ORDER BY
            CASE WHEN v_sort = 'best' AND m.sellable_qty > 0 THEN 0
                 WHEN v_sort = 'best' THEN 1 ELSE 0 END,
            CASE WHEN v_sort = 'price-asc' THEN m.price END ASC,
            CASE WHEN v_sort = 'price-desc' THEN m.price END DESC,
            m.name ASC,
            m.id ASC
        ) AS row_order
      FROM matching_items AS m
      ORDER BY
        CASE WHEN v_sort = 'best' AND m.sellable_qty > 0 THEN 0
             WHEN v_sort = 'best' THEN 1 ELSE 0 END,
        CASE WHEN v_sort = 'price-asc' THEN m.price END ASC,
        CASE WHEN v_sort = 'price-desc' THEN m.price END DESC,
        m.name ASC,
        m.id ASC
      LIMIT v_limit
      OFFSET v_offset
    ),
    page_products AS (
      SELECT
        pi.row_order,
        i.id,
        i.name,
        i.description,
        i.brand,
        COALESCE(i.mrp, i.price) AS mrp,
        i.price,
        i.image_url,
        c.name AS category,
        c.id AS category_id,
        GREATEST(
          0,
          COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0) - COALESCE(sl.qty_reserved_online, 0)
        )::integer AS sellable_qty,
        tr.name AS bengali_name,
        tr.description AS bengali_description
      FROM page_ids AS pi
      JOIN public.items AS i ON i.id = pi.id AND i.tenant_id = v_tenant_id
      LEFT JOIN public.categories AS c
        ON c.id = i.category_id
       AND c.tenant_id = v_tenant_id
      LEFT JOIN public.stock_levels AS sl
        ON sl.item_id = i.id
       AND sl.store_id = p_store_id
       AND sl.tenant_id = v_tenant_id
      LEFT JOIN public.item_translations AS tr
        ON tr.item_id = i.id
       AND tr.tenant_id = v_tenant_id
       AND tr.locale = 'bn'
       AND tr.review_status = 'published'
       AND (
         translation_private.is_publication_eligible(
           'item', tr.item_id, tr.tenant_id, tr.review_status, tr.evidence_snapshot,
           tr.reviewed_by, tr.reviewed_at, tr.published_by, tr.published_at
         )
         OR translation_private.is_legacy_item_publication_eligible(tr.id,tr.item_id,tr.tenant_id)
       )
       AND translation_private.is_product_details(tr.details)
    )
    SELECT jsonb_build_object(
      'items', COALESCE(
        (SELECT jsonb_agg(to_jsonb(page_products) - 'row_order' ORDER BY row_order)
         FROM page_products),
        '[]'::jsonb
      ),
      'total', (SELECT total FROM total_count)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.search_storefront_mobile_catalog_v1(uuid, text, uuid[], boolean, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_storefront_mobile_catalog_v1(uuid, text, uuid[], boolean, text, integer, integer)
  TO anon, authenticated, service_role;

-- Complete cutover only after RLS and the SECURITY DEFINER mobile reader both
-- recognize the immutable legacy cohort.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP POLICY IF EXISTS item_translations_legacy_transition_public ON public.item_translations;
DROP FUNCTION IF EXISTS translation_private.pre_migration_legacy_eligible(uuid,uuid,uuid);
COMMIT;
