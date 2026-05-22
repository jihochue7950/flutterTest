const ProductModel = require('../models/product.model');
const { success, error } = require('../utils/response');

// 공개: 활성 상품 목록
const getAll = async (req, res) => {
  try {
    const products = await ProductModel.findAll(true);
    return success(res, products);
  } catch (err) {
    console.error('getAll products error:', err);
    return error(res, '상품 목록 조회 실패', 500);
  }
};

// 공개: 상품 상세 (slug 또는 id)
const getOne = async (req, res) => {
  try {
    const { identifier } = req.params;
    const product = isNaN(identifier)
      ? await ProductModel.findBySlug(identifier)
      : await ProductModel.findById(Number(identifier));
    if (!product) return error(res, '상품을 찾을 수 없습니다.', 404);
    return success(res, product);
  } catch (err) {
    console.error('getOne product error:', err);
    return error(res, '상품 조회 실패', 500);
  }
};

// 관리자: 전체 상품 (비활성 포함)
const getAllAdmin = async (req, res) => {
  try {
    const products = await ProductModel.findAll(false);
    return success(res, products);
  } catch (err) {
    return error(res, '상품 목록 조회 실패', 500);
  }
};

// 관리자: 상품 생성
const create = async (req, res) => {
  try {
    if (!req.body.name || !req.body.slug || req.body.price === undefined) {
      return error(res, 'name, slug, price 는 필수입니다.', 400);
    }
    const product = await ProductModel.create(req.body);
    return success(res, product, '상품이 등록되었습니다.', 201);
  } catch (err) {
    console.error('create product error:', err);
    return error(res, err.message || '상품 등록 실패', 500);
  }
};

// 관리자: 상품 수정
const update = async (req, res) => {
  try {
    const product = await ProductModel.update(req.params.id, req.body);
    if (!product) return error(res, '상품을 찾을 수 없습니다.', 404);
    return success(res, product, '상품이 수정되었습니다.');
  } catch (err) {
    console.error('update product error:', err);
    return error(res, err.message || '상품 수정 실패', 500);
  }
};

// 관리자: 상품 삭제
const remove = async (req, res) => {
  try {
    const deleted = await ProductModel.remove(req.params.id);
    if (!deleted) return error(res, '상품을 찾을 수 없습니다.', 404);
    return success(res, { deleted: true }, '상품이 삭제되었습니다.');
  } catch (err) {
    console.error('remove product error:', err);
    return error(res, '상품 삭제 실패', 500);
  }
};

module.exports = { getAll, getOne, getAllAdmin, create, update, remove };
