import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exist');
    }

    const productsList = await this.productsRepository.findAllById(products);

    if (productsList.length < products.length) {
      throw new AppError('Invalid product ID');
    }

    const productsData = productsList.map(product => {
      const comparedProduct = products.find(
        inputProduct => inputProduct.id === product.id,
      );

      if (!comparedProduct) {
        throw new AppError('Product not found');
      }

      if (comparedProduct.quantity > product.quantity) {
        throw new AppError('Insufficient quantity');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: comparedProduct.quantity,
      };
    });

    const createProductsData = {
      customer,
      products: productsData,
    };

    const order = await this.ordersRepository.create(createProductsData);

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
