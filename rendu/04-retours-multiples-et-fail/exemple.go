package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

func Fail[V any]() Either[V] {
	return Either[V]{Kind: 3 /* Fail */, Information: "fail"}
}

func Success[V any](v V) Either[V] {
	return Either[V]{Kind: 2 /* Success */, Information: "success", Value: v}
}

// Les multiples branches de retour s'unifient naturellement sur Either[float64]
func Add(one, two float64) Either[float64] {
	if one == -1 {
		return Fail[float64]()
	}
	return Success(one + two)
}
